const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { supabase } = require('./config/supabase');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { isValidStudentEmail } = require('./utils/validators');
const { getRankTitle } = require('./utils/rank');
const email = require('./services/emailService');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const genAI = process.env.GOOGLE_AI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY) : null;

// ── Supabase Storage upload helper ──────────────────────────────────────────
const uploadToStorage = async (buffer, bucket, mimeType, filePath) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType: mimeType, upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return urlData.publicUrl;
};

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ── Admin action logger ────────────────────────────────────────────────────────
const logAdminAction = async (adminId, adminName, action, targetType, targetId, details = {}) => {
  try {
    await supabase.from('admin_activity_log').insert({
      admin_id: adminId,
      admin_name: adminName,
      action,
      target_type: targetType,
      target_id: String(targetId || ''),
      details,
    });
  } catch { /* non-critical */ }
};

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  faculty: user.faculty,
  university: user.faculty,   // alias so the UI field prefills correctly
  year_of_study: user.year_of_study,
  bio: user.bio,
  skills: user.skills || [],
  avatar_url: user.avatar_url,
  open_for_orders: user.open_for_orders,
  is_verified: user.is_verified,
  is_admin: user.is_admin,
  is_suspended: user.is_suspended || false,
  avg_rating: Number(user.avg_rating || 0),
  total_earnings: Number(user.total_earnings || 0),
  xp: user.xp || 0,
  rank_title: getRankTitle(user.xp || 0),
  account_type: user.account_type || 'seller',
  created_at: user.created_at,
});

const withSellerInfo = async (listings) => {
  if (!listings.length) return [];
  const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
  const { data: sellers } = await supabase
    .from('users')
    .select('id, name, avatar_url, avg_rating, open_for_orders, is_verified')
    .in('id', sellerIds);

  const sellerMap = new Map((sellers || []).map((s) => [s.id, s]));
  return listings.map((listing) => ({
    ...listing,
    seller: sellerMap.get(listing.seller_id) || null,
  }));
};

const recalcListingRating = async (listingId) => {
  const { data: reviews } = await supabase.from('reviews').select('rating').eq('listing_id', listingId);
  const count = (reviews || []).length;
  const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  await supabase
    .from('listings')
    .update({ rating_avg: Number(avg.toFixed(2)), review_count: count, updated_at: new Date().toISOString() })
    .eq('id', listingId);
};

const recalcSellerRating = async (sellerId) => {
  const { data: reviews } = await supabase.from('reviews').select('rating').eq('seller_id', sellerId);
  const count = (reviews || []).length;
  const avg = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  await supabase.from('users').update({ avg_rating: Number(avg.toFixed(2)) }).eq('id', sellerId);
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'CampusConnect API v2' });
});

// ── Auth: Register — creates account, generates OTP and sends it via SMTP ───
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email: emailAddr, password, name, faculty, year_of_study, account_type } = req.body;

    if (!emailAddr || !password || !name || !faculty || !year_of_study) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!isValidStudentEmail(emailAddr)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const role = account_type === 'buyer' ? 'buyer' : 'seller';
    const lowerEmail = emailAddr.toLowerCase();

    // Check if already registered
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', lowerEmail)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Create Supabase Auth user — email_confirm:true suppresses Supabase's own
    // confirmation email; verification is handled by our custom OTP flow.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: lowerEmail,
      password,
      email_confirm: true,
    });
    if (authError) {
      const msg = authError.message.toLowerCase().includes('already')
        ? 'Email already registered.'
        : authError.message;
      return res.status(409).json({ error: msg });
    }

    // Generate 6-digit OTP valid for 15 minutes
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Create profile row with OTP stored
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: lowerEmail,
      name,
      faculty,
      year_of_study: Number(year_of_study),
      account_type: role,
      is_verified: false,
      otp_code: otp,
      otp_expires_at: otpExpiresAt,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: profileError.message });
    }

    // Send OTP email — await so we can report failure to the frontend
    try {
      await email.sendOTPEmail({ email: lowerEmail, name }, otp);
    } catch (mailErr) {
      // Roll back account creation so the user can retry cleanly
      await supabase.from('users').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error('[register] email send failed:', mailErr.message);
      return res.status(500).json({ error: 'Account created but verification email failed. Please try again.' });
    }

    return res.status(201).json({ message: 'Account created! Check your email for your verification code.' });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── Auth: Resend OTP ─────────────────────────────────────────────────────────
app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const { email: emailAddr } = req.body;
    if (!emailAddr) return res.status(400).json({ error: 'Email is required.' });

    const lowerEmail = emailAddr.toLowerCase();
    const { data: user } = await supabase
      .from('users')
      .select('id, name, is_verified')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (user.is_verified) return res.status(400).json({ error: 'Account already verified. Please log in.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from('users').update({ otp_code: otp, otp_expires_at: otpExpiresAt }).eq('id', user.id);

    await email.sendOTPEmail({ email: lowerEmail, name: user.name }, otp);

    return res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('[resend-otp]', err);
    return res.status(500).json({ error: 'Could not send verification code. Please try again.' });
  }
});

// ── Auth: Verify OTP — confirms email, returns success so client can sign in ─
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email: emailAddr, code } = req.body;
    if (!emailAddr || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const lowerEmail = emailAddr.toLowerCase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, otp_code, otp_expires_at, is_verified')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (user.is_verified) {
      return res.json({ message: 'Already verified. You can log in.' });
    }
    if (!user.otp_code || user.otp_code !== code.trim()) {
      return res.status(400).json({ error: 'Invalid code. Please check your email and try again.' });
    }
    if (new Date(user.otp_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }

    // Confirm email in Supabase Auth + mark profile as verified, clear OTP
    await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
    await supabase
      .from('users')
      .update({ is_verified: true, otp_code: null, otp_expires_at: null })
      .eq('id', user.id);

    // Fetch full user for success email
    const { data: verifiedUser } = await supabase.from('users').select('name, email').eq('id', user.id).single();
    if (verifiedUser) email.sendVerificationSuccessEmail(verifiedUser);

    return res.json({ message: 'Email verified! You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── Auth: Login ──────────────────────────────────────────────────────────────
// Login is handled entirely client-side via @supabase/supabase-js signInWithPassword
// This endpoint returns the user profile after client sends a valid Bearer token
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  if (error || !data) return res.status(404).json({ error: 'Profile not found.' });
  return res.json({ user: sanitizeUser(data) });
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const update = {
    name: req.body.name,
    // form sends 'university' label but DB column is 'faculty' — accept both
    faculty: req.body.faculty || req.body.university,
    year_of_study: req.body.year_of_study ? Number(req.body.year_of_study) : undefined,
    bio: req.body.bio,
    open_for_orders: typeof req.body.open_for_orders === 'boolean' ? req.body.open_for_orders : undefined,
    updated_at: new Date().toISOString(),
  };

  if (typeof req.body.skills === 'string') {
    update.skills = req.body.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

  const { data, error } = await supabase.from('users').update(update).eq('id', req.user.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });

  email.sendProfileUpdatedEmail(sanitizeUser(data));
  return res.json({ user: sanitizeUser(data) });
});

app.post('/api/profile/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Avatar image is required.' });

  const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_AVATAR_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, or GIF images are allowed as avatars.' });
  }

  try {
    const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extMap[req.file.mimetype] || 'jpg';
    const filePath = `${req.user.id}/avatar.${ext}`;
    const bucket = process.env.SUPABASE_AVATAR_BUCKET || 'avatars';
    const avatarUrl = await uploadToStorage(req.file.buffer, bucket, req.file.mimetype, filePath);

    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    email.sendAvatarUpdatedEmail(sanitizeUser(data));
    return res.json({ user: sanitizeUser(data) });
  } catch (err) {
    return res.status(500).json({ error: 'Avatar upload failed: ' + err.message });
  }
});

app.post('/api/listings', requireAuth, upload.array('images', 3), async (req, res) => {
  if (req.user.account_type === 'buyer') {
    return res.status(403).json({ error: 'Buyers cannot create listings. Switch to a seller account.' });
  }
  const {
    title,
    description,
    category,
    price_type,
    price,
    delivery_method,
    turnaround_time,
    availability,
  } = req.body;

  if (!title || !description || !category || !price_type || !delivery_method || !turnaround_time) {
    return res.status(400).json({ error: 'Missing listing fields.' });
  }

  try {
    const bucket = process.env.SUPABASE_LISTING_BUCKET || 'listings';
    const images = [];
    for (const file of req.files || []) {
      const ext = file.mimetype.split('/')[1] || 'jpg';
      const filePath = `${req.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const url = await uploadToStorage(file.buffer, bucket, file.mimetype, filePath);
      images.push(url);
    }

    const { data, error } = await supabase
      .from('listings')
      .insert({
        seller_id: req.user.id,
        title,
        description,
        category,
        price_type,
        price: price ? Number(price) : null,
        delivery_method,
        turnaround_time,
        availability: availability === 'false' ? false : true,
        images,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    // Fetch seller info for the email
    const { data: seller } = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
    if (seller) email.sendListingCreatedEmail(seller, data);
    return res.status(201).json({ listing: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create listing: ' + err.message });
  }
});

app.put('/api/listings/:id', requireAuth, upload.array('images', 3), async (req, res) => {
  if (req.user.account_type === 'buyer') {
    return res.status(403).json({ error: 'Buyers cannot edit listings.' });
  }
  const listingId = req.params.id;
  const { data: existing } = await supabase.from('listings').select('*').eq('id', listingId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });
  if (existing.seller_id !== req.user.id) return res.status(403).json({ error: 'Not allowed.' });

  try {
    const bucket = process.env.SUPABASE_LISTING_BUCKET || 'listings';
    const images = [...(existing.images || [])];
    for (const file of req.files || []) {
      const ext = file.mimetype.split('/')[1] || 'jpg';
      const filePath = `${req.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const url = await uploadToStorage(file.buffer, bucket, file.mimetype, filePath);
      images.push(url);
    }

    const update = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      price_type: req.body.price_type,
      price: req.body.price ? Number(req.body.price) : existing.price,
      delivery_method: req.body.delivery_method,
      turnaround_time: req.body.turnaround_time,
      availability: req.body.availability === 'false' ? false : req.body.availability === 'true' ? true : existing.availability,
      images: images.slice(0, 3),
      updated_at: new Date().toISOString(),
    };

    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const { data, error } = await supabase.from('listings').update(update).eq('id', listingId).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    const { data: sellerU } = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
    if (sellerU) email.sendListingUpdatedEmail(sellerU, data);
    return res.json({ listing: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update listing.' });
  }
});

// Toggle availability or make small updates (dashboard actions)
app.patch('/api/listings/:id', requireAuth, async (req, res) => {
  const { data: existing } = await supabase.from('listings').select('seller_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });
  if (existing.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });

  const allowed = ['is_available', 'title', 'price', 'description'];
  const update = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('listings').update(update).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  // Send toggled/updated email if availability changed
  if (req.body.is_available !== undefined) {
    const { data: sellerPatch } = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
    if (sellerPatch) email.sendListingToggledEmail(sellerPatch, data);
  }
  return res.json({ listing: data });
});

// Delete own listing
app.delete('/api/listings/:id', requireAuth, async (req, res) => {
  const { data: existing } = await supabase.from('listings').select('seller_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });
  if (existing.seller_id !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });

  const { data: listingToDelete } = await supabase.from('listings').select('title').eq('id', req.params.id).single();
  const { error } = await supabase.from('listings').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  const { data: sellerDel } = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
  if (sellerDel && listingToDelete) email.sendListingDeletedEmail(sellerDel, listingToDelete.title);
  return res.json({ success: true });
});

app.get('/api/listings', async (req, res) => {
  const { q, category, delivery, minRating, sort = 'newest', minPrice, maxPrice, sellerId } = req.query;

  let query = supabase.from('listings').select('*');

  if (category && category !== 'All') query = query.eq('category', category);
  if (delivery) query = query.eq('delivery_method', delivery);
  if (sellerId) query = query.eq('seller_id', sellerId);
  // Only show approved/featured on public browse; sellers see their own regardless
  if (!sellerId) query = query.in('status', ['approved', 'featured']);
  if (minRating) query = query.gte('rating_avg', Number(minRating));
  if (minPrice) query = query.gte('price', Number(minPrice));
  if (maxPrice) query = query.lte('price', Number(maxPrice));

  if (sort === 'top-rated') query = query.order('rating_avg', { ascending: false });
  if (sort === 'lowest-price') query = query.order('price', { ascending: true, nullsFirst: false });
  if (sort === 'newest') query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  let listings = data || [];
  if (q) {
    const needle = q.toLowerCase();
    listings = listings.filter(
      (listing) => listing.title.toLowerCase().includes(needle) || listing.description.toLowerCase().includes(needle)
    );
  }

  const merged = await withSellerInfo(listings);
  return res.json({ listings: merged });
});

app.get('/api/listings/:id', async (req, res) => {
  const { data: listing, error } = await supabase.from('listings').select('*').eq('id', req.params.id).maybeSingle();
  if (error || !listing) return res.status(404).json({ error: 'Listing not found.' });

  const merged = await withSellerInfo([listing]);
  const { data: reviews } = await supabase.from('reviews').select('*').eq('listing_id', listing.id).order('created_at', { ascending: false });

  const buyerIds = [...new Set((reviews || []).map((r) => r.buyer_id))];
  const { data: buyers } = buyerIds.length
    ? await supabase.from('users').select('id, name, avatar_url').in('id', buyerIds)
    : { data: [] };
  const buyerMap = new Map((buyers || []).map((b) => [b.id, b]));

  const enrichedReviews = (reviews || []).map((review) => ({
    ...review,
    buyer: buyerMap.get(review.buyer_id) || null,
  }));

  return res.json({ listing: merged[0], reviews: enrichedReviews });
});

app.post('/api/chat/conversations', requireAuth, async (req, res) => {
  const { sellerId, listingId } = req.body;
  if (!sellerId) return res.status(400).json({ error: 'sellerId is required.' });
  if (sellerId === req.user.id) return res.status(400).json({ error: 'Cannot message yourself.' });

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('buyer_id', req.user.id)
    .eq('seller_id', sellerId)
    .eq('listing_id', listingId || null)
    .maybeSingle();

  if (existing) return res.json({ conversation: existing });

  const { data, error } = await supabase
    .from('conversations')
    .insert({ buyer_id: req.user.id, seller_id: sellerId, listing_id: listingId || null })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ conversation: data });
});

app.get('/api/chat/conversations', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  const userIds = [...new Set((data || []).flatMap((c) => [c.buyer_id, c.seller_id]))];
  const { data: users } = userIds.length ? await supabase.from('users').select('id, name, avatar_url').in('id', userIds) : { data: [] };
  const userMap = new Map((users || []).map((u) => [u.id, u]));

  // Fetch last message per conversation
  const convIds = (data || []).map((c) => c.id);
  const lastMessageMap = new Map();
  if (convIds.length) {
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });
    (lastMsgs || []).forEach((msg) => {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg.content);
      }
    });
  }

  const conversations = (data || []).map((c) => {
    const otherUserId = c.buyer_id === req.user.id ? c.seller_id : c.buyer_id;
    return { ...c, other_user: userMap.get(otherUserId) || null, last_message: lastMessageMap.get(c.id) || null };
  });

  return res.json({ conversations });
});

app.get('/api/chat/conversations/:id/messages', requireAuth, async (req, res) => {
  const convoId = req.params.id;
  const { data: convo } = await supabase.from('conversations').select('*').eq('id', convoId).maybeSingle();
  if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
  if (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', convoId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ messages: data || [] });
});

app.post('/api/chat/conversations/:id/messages', requireAuth, async (req, res) => {
  const convoId = req.params.id;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required.' });

  const { data: convo } = await supabase.from('conversations').select('*').eq('id', convoId).maybeSingle();
  if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
  if (convo.buyer_id !== req.user.id && convo.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Not allowed.' });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: convoId, sender_id: req.user.id, content: content.trim() })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Realtime delivery handled by Supabase Realtime (client-side subscriptions)
  const recipientId = convo.buyer_id === req.user.id ? convo.seller_id : convo.buyer_id;
  // Email the recipient (fire-and-forget)
  const { data: msgSender }    = await supabase.from('users').select('name').eq('id', req.user.id).single();
  const { data: msgRecipient } = await supabase.from('users').select('name, email').eq('id', recipientId).single();
  if (msgSender && msgRecipient) email.sendNewMessageEmail(msgRecipient, msgSender, content.trim());

  return res.status(201).json({ message: data });
});

app.post('/api/bookings', requireAuth, async (req, res) => {
  const { listingId, preferredDateTime, message } = req.body;
  if (!listingId) return res.status(400).json({ error: 'listingId is required.' });

  const { data: listing } = await supabase.from('listings').select('*').eq('id', listingId).maybeSingle();
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.seller_id === req.user.id) return res.status(400).json({ error: 'Cannot book your own listing.' });

  const { data, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: req.user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      preferred_datetime: preferredDateTime || null,
      buyer_message: message || null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Realtime delivery handled by Supabase Realtime (client-side subscriptions)
  // Email the seller about the new booking
  const { data: sellerBook } = await supabase.from('users').select('name, email').eq('id', listing.seller_id).single();
  const { data: buyerBook } = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
  if (sellerBook && buyerBook) email.sendNewBookingToSeller(sellerBook, buyerBook, listing, data);
  return res.status(201).json({ order: data });
});

app.get('/api/bookings/mine', requireAuth, async (req, res) => {
  const role = req.query.role === 'seller' ? 'seller' : 'buyer';
  const column = role === 'seller' ? 'seller_id' : 'buyer_id';

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq(column, req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  // Enrich orders with listing title
  const listingIds = [...new Set((data || []).filter((o) => o.listing_id).map((o) => o.listing_id))];
  const { data: listings } = listingIds.length
    ? await supabase.from('listings').select('id, title').in('id', listingIds)
    : { data: [] };
  const listingMap = new Map((listings || []).map((l) => [l.id, l]));
  const orders = (data || []).map((o) => ({ ...o, listing: listingMap.get(o.listing_id) || null }));

  return res.json({ orders });
});

app.patch('/api/bookings/:id/respond', requireAuth, async (req, res) => {
  const { action, agreedScope, agreedPrice, deadline } = req.body;
  if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'Action must be accept or decline.' });

  const { data: order } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can respond.' });

  const now = Date.now();
  const createdAt = new Date(order.created_at).getTime();
  const fast = now - createdAt <= 60 * 60 * 1000;

  const update = {
    status: action === 'accept' ? 'accepted' : 'declined',
    agreed_scope: agreedScope || order.agreed_scope,
    agreed_price: agreedPrice !== undefined ? Number(agreedPrice) : order.agreed_price,
    deadline: deadline || order.deadline,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('orders').update(update).eq('id', order.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });

  if (fast) {
    const { data: seller } = await supabase.from('users').select('xp, fast_response_count').eq('id', req.user.id).single();
    await supabase
      .from('users')
      .update({ xp: (seller.xp || 0) + 5, fast_response_count: (seller.fast_response_count || 0) + 1 })
      .eq('id', req.user.id);
  }

  // Realtime delivery handled by Supabase Realtime (client-side subscriptions)
  // Email the buyer
  const { data: buyerResp } = await supabase.from('users').select('name, email').eq('id', order.buyer_id).single();
  const { data: sellerResp } = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
  const { data: listingResp } = await supabase.from('listings').select('id, title').eq('id', order.listing_id).single();
  if (buyerResp && sellerResp && listingResp) {
    if (action === 'accept') email.sendBookingAcceptedToBuyer(buyerResp, sellerResp, listingResp, data);
    else email.sendBookingDeclinedToBuyer(buyerResp, sellerResp, listingResp);
  }
  return res.json({ order: data });
});

app.patch('/api/bookings/:id/complete', requireAuth, async (req, res) => {
  const { data: order } = await supabase.from('orders').select('*').eq('id', req.params.id).maybeSingle();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only buyer can mark complete.' });
  if (order.status !== 'accepted') return res.status(400).json({ error: 'Only accepted orders can be completed.' });

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'completed', completed_at: completedAt, updated_at: completedAt })
    .eq('id', order.id)
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const { data: seller } = await supabase.from('users').select('xp, total_earnings').eq('id', order.seller_id).single();
  await supabase
    .from('users')
    .update({
      xp: (seller.xp || 0) + 10,
      total_earnings: Number(seller.total_earnings || 0) + Number(order.agreed_price || 0),
    })
    .eq('id', order.seller_id);

  // Realtime delivery handled by Supabase Realtime (client-side subscriptions)
  // Email the seller
  const { data: sellerComp } = await supabase.from('users').select('name, email').eq('id', order.seller_id).single();
  const { data: buyerComp }  = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
  const { data: listingComp } = await supabase.from('listings').select('id, title').eq('id', order.listing_id).single();
  if (sellerComp && buyerComp && listingComp) email.sendOrderCompletedToSeller(sellerComp, buyerComp, listingComp, data);
  return res.json({ order: data });
});

app.post('/api/reviews', requireAuth, async (req, res) => {
  const { orderId, rating, content } = req.body;
  if (!orderId || !rating || !content) return res.status(400).json({ error: 'orderId, rating, content are required.' });

  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.buyer_id !== req.user.id) return res.status(403).json({ error: 'Only the buyer can review.' });
  if (order.status !== 'completed') return res.status(400).json({ error: 'Order must be completed before review.' });

  const { data: existing } = await supabase.from('reviews').select('id').eq('order_id', order.id).maybeSingle();
  if (existing) return res.status(409).json({ error: 'Review already exists for this order.' });

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      order_id: order.id,
      listing_id: order.listing_id,
      buyer_id: req.user.id,
      seller_id: order.seller_id,
      rating: Number(rating),
      content,
    })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (Number(rating) === 5) {
    const { data: seller } = await supabase.from('users').select('xp').eq('id', order.seller_id).single();
    await supabase.from('users').update({ xp: (seller.xp || 0) + 20 }).eq('id', order.seller_id);
  }

  await recalcListingRating(order.listing_id);
  await recalcSellerRating(order.seller_id);
  // Email the seller about the new review
  const { data: sellerRev }  = await supabase.from('users').select('name, email').eq('id', order.seller_id).single();
  const { data: buyerRev }   = await supabase.from('users').select('name, email').eq('id', req.user.id).single();
  const { data: listingRev } = await supabase.from('listings').select('id, title').eq('id', order.listing_id).single();
  if (sellerRev && buyerRev && listingRev) email.sendReviewReceivedEmail(sellerRev, buyerRev, listingRev, data);
  return res.status(201).json({ review: data });
});

app.get('/api/reviews/mine', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, listing:listings(id, title), seller:users!reviews_seller_id_fkey(id, name, avatar_url)')
    .eq('buyer_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ reviews: data || [] });
});

app.patch('/api/reviews/:id/reply', requireAuth, async (req, res) => {
  const { reply } = req.body;
  if (!reply?.trim()) return res.status(400).json({ error: 'Reply is required.' });

  const { data: review } = await supabase.from('reviews').select('*').eq('id', req.params.id).maybeSingle();
  if (!review) return res.status(404).json({ error: 'Review not found.' });
  if (review.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can reply.' });
  if (review.seller_reply) return res.status(409).json({ error: 'Reply already submitted.' });

  const { data, error } = await supabase
    .from('reviews')
    .update({ seller_reply: reply.trim() })
    .eq('id', review.id)
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ review: data });
});

app.post('/api/ai/match', async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required.' });
  if (!genAI) return res.status(500).json({ error: 'AI is not configured.' });

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, description, category, price, rating_avg, seller_id')
    .eq('availability', true)
    .order('created_at', { ascending: false })
    .limit(100);

  const listingRows = await withSellerInfo(listings || []);
  const compactListings = listingRows.map((l) => ({
    listingId: l.id,
    sellerName: l.seller?.name || 'Unknown',
    title: l.title,
    description: l.description,
    category: l.category,
    price: l.price,
    rating: l.rating_avg,
  }));

  const systemPrompt =
    "You are a marketplace assistant. Extract the skill needed, budget (if mentioned), and urgency (if mentioned) from the user's request. Then from the listings array provided, return the 3 best matches as a JSON array with fields: listingId, sellerName, title, price, rating, reason. Return only valid JSON, no explanation.";

  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(
      `User request: ${query}\n\nListings: ${JSON.stringify(compactListings)}`
    );
    const raw = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    return res.json({ matches: Array.isArray(parsed) ? parsed.slice(0, 3) : [] });
  } catch (err) {
    return res.status(500).json({ error: 'AI matching failed.', details: err.message });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data: completedOrders } = await supabase
    .from('orders')
    .select('id, seller_id, agreed_price')
    .eq('status', 'completed')
    .gte('completed_at', startOfMonth.toISOString());

  const sellerStats = new Map();
  for (const order of completedOrders || []) {
    const prev = sellerStats.get(order.seller_id) || { completedOrders: 0, totalEarnings: 0 };
    prev.completedOrders += 1;
    prev.totalEarnings += Number(order.agreed_price || 0);
    sellerStats.set(order.seller_id, prev);
  }

  const sellerIds = [...sellerStats.keys()];
  const { data: users } = sellerIds.length
    ? await supabase.from('users').select('id, name, avatar_url, avg_rating, xp').in('id', sellerIds)
    : { data: [] };

  const rows = (users || []).map((u) => {
    const stat = sellerStats.get(u.id) || { completedOrders: 0, totalEarnings: 0 };
    return {
      sellerId: u.id,
      sellerName: u.name,
      avatarUrl: u.avatar_url,
      avgRating: Number(u.avg_rating || 0),
      completedOrders: stat.completedOrders,
      totalEarnings: Number(stat.totalEarnings.toFixed(2)),
      xp: u.xp || 0,
      rankTitle: getRankTitle(u.xp || 0),
      score: stat.completedOrders * 3 + Number(u.avg_rating || 0) * 2 + stat.totalEarnings / 200,
    };
  });

  rows.sort((a, b) => b.score - a.score);
  return res.json({ leaderboard: rows.slice(0, 10) });
});

// ── Admin: Stats ──────────────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  const [
    { count: totalUsers },
    { count: totalListings },
    { count: pendingListings },
    { count: openReports },
    { count: totalOrders },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('moderation_flags').select('*', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
  ]);

  const { data: earnings } = await supabase.from('orders').select('agreed_price').eq('status', 'completed');
  const totalEarnings = (earnings || []).reduce((s, o) => s + Number(o.agreed_price || 0), 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: newSignups } = await supabase
    .from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo);

  return res.json({ totalUsers, totalListings, pendingListings, openReports, totalOrders,
    totalEarnings: Number(totalEarnings.toFixed(2)), newSignups });
});

// ── Admin: Listings moderation ─────────────────────────────────────────────────
app.get('/api/admin/listings', requireAuth, requireAdmin, async (req, res) => {
  const { status, q } = req.query;
  let query = supabase.from('listings').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  let listings = data || [];
  if (q) {
    const needle = q.toLowerCase();
    listings = listings.filter(l =>
      (l.title || '').toLowerCase().includes(needle) ||
      (l.category || '').toLowerCase().includes(needle));
  }
  const enriched = await withSellerInfo(listings);
  return res.json({ listings: enriched });
});

app.patch('/api/admin/listings/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('listings')
    .update({ status: 'approved', moderation_note: null, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('title').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'approved_listing', 'listing', req.params.id, { title: data.title });
  return res.json({ message: 'Listing approved.' });
});

app.patch('/api/admin/listings/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const { reason = 'Does not meet our guidelines.' } = req.body;
  const { data, error } = await supabase.from('listings')
    .update({ status: 'rejected', moderation_note: reason, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('title').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'rejected_listing', 'listing', req.params.id, { title: data.title, reason });
  return res.json({ message: 'Listing rejected.' });
});

app.patch('/api/admin/listings/:id/feature', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('listings')
    .update({ status: 'featured', is_featured: true, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('title').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'featured_listing', 'listing', req.params.id, { title: data.title });
  return res.json({ message: 'Listing featured.' });
});

app.delete('/api/admin/listings/:id', requireAuth, requireAdmin, async (req, res) => {
  const { data } = await supabase.from('listings').select('title').eq('id', req.params.id).single();
  const { error } = await supabase.from('listings').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'deleted_listing', 'listing', req.params.id, { title: data?.title });
  return res.json({ message: 'Listing removed.' });
});

app.patch('/api/admin/listings/bulk', requireAuth, requireAdmin, async (req, res) => {
  const { ids, action, reason } = req.body;
  if (!ids?.length || !action) return res.status(400).json({ error: 'ids and action required.' });
  const statusMap = { approve: 'approved', reject: 'rejected', feature: 'featured' };
  const newStatus = statusMap[action];
  if (!newStatus) return res.status(400).json({ error: 'Invalid action.' });
  const update = { status: newStatus, updated_at: new Date().toISOString() };
  if (action === 'reject' && reason) update.moderation_note = reason;
  const { error } = await supabase.from('listings').update(update).in('id', ids);
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, `bulk_${action}_listings`, 'listing', ids.join(','), { count: ids.length });
  return res.json({ message: `${ids.length} listing(s) ${action}d.` });
});

// ── Admin: User management ────────────────────────────────────────────────────
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { q, status } = req.query;
  let query = supabase.from('users')
    .select('id, email, name, faculty, year_of_study, is_verified, is_admin, is_suspended, avg_rating, xp, created_at')
    .order('created_at', { ascending: false });
  if (status === 'suspended') query = query.eq('is_suspended', true);
  if (status === 'active') query = query.eq('is_suspended', false);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  let users = data || [];
  if (q) {
    const needle = q.toLowerCase();
    users = users.filter(u =>
      (u.name || '').toLowerCase().includes(needle) ||
      (u.email || '').toLowerCase().includes(needle) ||
      (u.faculty || '').toLowerCase().includes(needle));
  }
  const userIds = users.map(u => u.id);
  if (userIds.length) {
    const { data: listings } = await supabase.from('listings').select('seller_id').in('seller_id', userIds);
    const countMap = (listings || []).reduce((m, l) => { m[l.seller_id] = (m[l.seller_id] || 0) + 1; return m; }, {});
    users = users.map(u => ({ ...u, listing_count: countMap[u.id] || 0 }));
  }
  return res.json({ users });
});

app.patch('/api/admin/users/:id/suspend', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('users')
    .update({ is_suspended: true, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('name').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'suspended_user', 'user', req.params.id, { name: data.name });
  return res.json({ message: 'User suspended.' });
});

app.patch('/api/admin/users/:id/reactivate', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('users')
    .update({ is_suspended: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('name').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'reactivated_user', 'user', req.params.id, { name: data.name });
  return res.json({ message: 'User reactivated.' });
});

// ── Admin: Reports ────────────────────────────────────────────────────────────
app.get('/api/admin/reports', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('moderation_flags').select('*').order('created_at', { ascending: false });
  if (status === 'open') query = query.eq('resolved', false);
  if (status === 'resolved') query = query.eq('resolved', true);
  const { data: flags, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  const listingIds = [...new Set((flags || []).filter(f => f.listing_id).map(f => f.listing_id))];
  let listingMap = {};
  if (listingIds.length) {
    const { data: listings } = await supabase.from('listings').select('id, title, status, seller_id').in('id', listingIds);
    listingMap = (listings || []).reduce((m, l) => { m[l.id] = l; return m; }, {});
  }
  return res.json({ reports: (flags || []).map(f => ({ ...f, listing: f.listing_id ? listingMap[f.listing_id] : null })) });
});

app.post('/api/admin/listings/:id/flag', requireAuth, requireAdmin, async (req, res) => {
  const { reason } = req.body;
  const { data, error } = await supabase.from('moderation_flags')
    .insert({ listing_id: req.params.id, reason: reason || 'Flagged by admin' }).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ flag: data });
});

app.patch('/api/admin/reports/:id/dismiss', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('moderation_flags')
    .update({ resolved: true, action_taken: 'dismissed', resolved_at: new Date().toISOString(), resolved_by: req.user.id })
    .eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'dismissed_report', 'report', req.params.id);
  return res.json({ message: 'Report dismissed.' });
});

app.patch('/api/admin/reports/:id/action', requireAuth, requireAdmin, async (req, res) => {
  const { action, reason = '' } = req.body;
  const { data: flag, error: flagErr } = await supabase.from('moderation_flags')
    .select('listing_id').eq('id', req.params.id).single();
  if (flagErr) return res.status(400).json({ error: flagErr.message });
  await supabase.from('moderation_flags').update({
    resolved: true, action_taken: action,
    resolved_at: new Date().toISOString(), resolved_by: req.user.id,
  }).eq('id', req.params.id);
  if (action === 'reject_listing' && flag.listing_id) {
    await supabase.from('listings').update({ status: 'rejected', moderation_note: reason || 'Rejected following a report.' }).eq('id', flag.listing_id);
  }
  if (action === 'suspend_user' && flag.listing_id) {
    const { data: listing } = await supabase.from('listings').select('seller_id').eq('id', flag.listing_id).single();
    if (listing) await supabase.from('users').update({ is_suspended: true }).eq('id', listing.seller_id);
  }
  await logAdminAction(req.user.id, req.user.name, `report_action_${action}`, 'report', req.params.id, { reason });
  return res.json({ message: 'Action taken.' });
});

// ── Admin: Categories ────────────────────────────────────────────────────────
app.get('/api/categories', async (_req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('display_order');
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ categories: data || [] });
});

app.get('/api/admin/categories', requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('categories').select('*').order('display_order');
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ categories: data || [] });
});

app.post('/api/admin/categories', requireAuth, requireAdmin, async (req, res) => {
  const { name, icon = '✨', description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name required.' });
  const { data: last } = await supabase.from('categories').select('display_order').order('display_order', { ascending: false }).limit(1).single();
  const { data, error } = await supabase.from('categories')
    .insert({ name, icon, description, display_order: (last?.display_order || 0) + 1 }).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'created_category', 'category', data.id, { name });
  return res.status(201).json({ category: data });
});

app.put('/api/admin/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, icon, description } = req.body;
  const update = {};
  if (name) update.name = name;
  if (icon) update.icon = icon;
  if (description !== undefined) update.description = description;
  const { data, error } = await supabase.from('categories').update(update).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'updated_category', 'category', req.params.id, { name: data.name });
  return res.json({ category: data });
});

app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const { data } = await supabase.from('categories').select('name').eq('id', req.params.id).single();
  const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'deleted_category', 'category', req.params.id, { name: data?.name });
  return res.json({ message: 'Category deleted.' });
});

app.patch('/api/admin/categories/reorder', requireAuth, requireAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required.' });
  await Promise.all(ids.map((id, i) => supabase.from('categories').update({ display_order: i + 1 }).eq('id', id)));
  await logAdminAction(req.user.id, req.user.name, 'reordered_categories', 'category', '', {});
  return res.json({ message: 'Categories reordered.' });
});

// ── Admin: Announcements ──────────────────────────────────────────────────────
app.get('/api/announcements', async (_req, res) => {
  const { data, error } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ announcements: data || [] });
});

app.get('/api/admin/announcements', requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ announcements: data || [] });
});

app.post('/api/admin/announcements', requireAuth, requireAdmin, async (req, res) => {
  const { title, content, target_role = 'all' } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required.' });
  const { data, error } = await supabase.from('announcements')
    .insert({ title, content, target_role }).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'created_announcement', 'announcement', data.id, { title });
  return res.status(201).json({ announcement: data });
});

app.put('/api/admin/announcements/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, content, target_role } = req.body;
  const update = { updated_at: new Date().toISOString() };
  if (title) update.title = title;
  if (content) update.content = content;
  if (target_role) update.target_role = target_role;
  const { data, error } = await supabase.from('announcements').update(update).eq('id', req.params.id).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'updated_announcement', 'announcement', req.params.id, { title: data.title });
  return res.json({ announcement: data });
});

app.patch('/api/admin/announcements/:id/deactivate', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('announcements')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('title').single();
  if (error) return res.status(400).json({ error: error.message });
  await logAdminAction(req.user.id, req.user.name, 'deactivated_announcement', 'announcement', req.params.id, { title: data.title });
  return res.json({ message: 'Announcement deactivated.' });
});

app.patch('/api/admin/announcements/:id/activate', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('announcements')
    .update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: 'Announcement activated.' });
});

app.delete('/api/admin/announcements/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ message: 'Announcement deleted.' });
});

// ── Admin: Activity log + recent signups ─────────────────────────────────────
app.get('/api/admin/activity-log', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const { data, error } = await supabase.from('admin_activity_log')
    .select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ log: data || [] });
});

app.get('/api/admin/recent-signups', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const { data, error } = await supabase.from('users')
    .select('id, name, email, faculty, is_verified, is_suspended, created_at')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ users: data || [] });
});

app.get('/api/seller/:id', async (req, res) => {
  const sellerId = req.params.id;

  const { data: user, error } = await supabase.from('users').select('*').eq('id', sellerId).maybeSingle();
  if (error || !user) return res.status(404).json({ error: 'Seller not found.' });

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  return res.json({ seller: sanitizeUser(user), listings: listings || [] });
});

app.get('/api/dashboard/seller', requireAuth, async (req, res) => {
  const { data: listings } = await supabase.from('listings').select('*').eq('seller_id', req.user.id);
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false });

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const totalEarnings = (orders || [])
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.agreed_price || 0), 0);

  const pendingOrders = (orders || []).filter((o) => ['pending', 'accepted'].includes(o.status)).length;

  return res.json({
    summary: {
      activeListings: (listings || []).filter((l) => l.availability).length,
      pendingOrders,
      totalEarnings: Number(totalEarnings.toFixed(2)),
    },
    listings: listings || [],
    recentOrders: (orders || []).slice(0, 6),
    recentReviews: reviews || [],
  });
});

// ── Reports / Data Export ────────────────────────────────────────────────────
// GET /api/reports/export?type=bookings|listings|orders|earnings|reviews
//                               admin-users|admin-listings|admin-bookings
app.get('/api/reports/export', requireAuth, async (req, res) => {
  const { type } = req.query;
  const userId = req.user.id;
  const isAdmin = req.user.is_admin;

  if (type === 'bookings') {
    // Buyer: all bookings they made
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, agreed_price, buyer_message, preferred_datetime, created_at, listing_id')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    const listingIds = [...new Set((data || []).map((o) => o.listing_id).filter(Boolean))];
    const { data: listings } = listingIds.length
      ? await supabase.from('listings').select('id, title, category, price').in('id', listingIds)
      : { data: [] };
    const lMap = new Map((listings || []).map((l) => [l.id, l]));
    const rows = (data || []).map((o) => {
      const l = lMap.get(o.listing_id) || {};
      return {
        'Booking ID': o.id,
        Service: l.title || '—',
        Category: l.category || '—',
        Price: l.price ? `R${Number(l.price).toFixed(2)}` : 'Negotiable',
        Status: o.status,
        'Agreed Price': o.agreed_price ? `R${Number(o.agreed_price).toFixed(2)}` : '—',
        Message: o.buyer_message || '—',
        'Preferred Date': o.preferred_datetime ? new Date(o.preferred_datetime).toLocaleDateString() : '—',
        'Created At': new Date(o.created_at).toLocaleDateString(),
      };
    });
    return res.json({ title: 'My Bookings', rows });
  }

  if (type === 'orders') {
    // Seller: all orders they received
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, agreed_price, buyer_message, preferred_datetime, created_at, listing_id, buyer_id')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    const listingIds = [...new Set((data || []).map((o) => o.listing_id).filter(Boolean))];
    const buyerIds = [...new Set((data || []).map((o) => o.buyer_id).filter(Boolean))];
    const [{ data: listings }, { data: buyers }] = await Promise.all([
      listingIds.length ? supabase.from('listings').select('id, title, category').in('id', listingIds) : { data: [] },
      buyerIds.length ? supabase.from('users').select('id, name, email').in('id', buyerIds) : { data: [] },
    ]);
    const lMap = new Map((listings || []).map((l) => [l.id, l]));
    const bMap = new Map((buyers || []).map((u) => [u.id, u]));
    const rows = (data || []).map((o) => {
      const l = lMap.get(o.listing_id) || {};
      const b = bMap.get(o.buyer_id) || {};
      return {
        'Order ID': o.id,
        Service: l.title || '—',
        Category: l.category || '—',
        'Buyer Name': b.name || '—',
        'Buyer Email': b.email || '—',
        Status: o.status,
        'Agreed Price': o.agreed_price ? `R${Number(o.agreed_price).toFixed(2)}` : '—',
        Message: o.buyer_message || '—',
        'Preferred Date': o.preferred_datetime ? new Date(o.preferred_datetime).toLocaleDateString() : '—',
        'Created At': new Date(o.created_at).toLocaleDateString(),
      };
    });
    return res.json({ title: 'My Orders', rows });
  }

  if (type === 'earnings') {
    // Seller: completed orders earnings summary
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, agreed_price, created_at, listing_id')
      .eq('seller_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    const listingIds = [...new Set((data || []).map((o) => o.listing_id).filter(Boolean))];
    const { data: listings } = listingIds.length
      ? await supabase.from('listings').select('id, title').in('id', listingIds)
      : { data: [] };
    const lMap = new Map((listings || []).map((l) => [l.id, l]));
    const total = (data || []).reduce((s, o) => s + Number(o.agreed_price || 0), 0);
    const rows = (data || []).map((o) => ({
      'Order ID': o.id,
      Service: (lMap.get(o.listing_id) || {}).title || '—',
      'Earned (R)': o.agreed_price ? Number(o.agreed_price).toFixed(2) : '0.00',
      Date: new Date(o.created_at).toLocaleDateString(),
    }));
    rows.push({ 'Order ID': '', Service: 'TOTAL', 'Earned (R)': total.toFixed(2), Date: '' });
    return res.json({ title: 'My Earnings', rows });
  }

  if (type === 'listings') {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, category, price, price_type, is_available, views, created_at')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    const rows = (data || []).map((l) => ({
      'Listing ID': l.id,
      Title: l.title,
      Category: l.category || '—',
      Price: l.price_type === 'negotiable' ? 'Negotiable' : l.price ? `R${Number(l.price).toFixed(2)}` : 'Free',
      Status: l.is_available === false ? 'Paused' : 'Live',
      Views: l.views || 0,
      'Created At': new Date(l.created_at).toLocaleDateString(),
    }));
    return res.json({ title: 'My Listings', rows });
  }

  if (type === 'reviews') {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, listing_id, buyer_id')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });

    const listingIds = [...new Set((data || []).map((r) => r.listing_id).filter(Boolean))];
    const buyerIds = [...new Set((data || []).map((r) => r.buyer_id).filter(Boolean))];
    const [{ data: listings }, { data: buyers }] = await Promise.all([
      listingIds.length ? supabase.from('listings').select('id, title').in('id', listingIds) : { data: [] },
      buyerIds.length ? supabase.from('users').select('id, name').in('id', buyerIds) : { data: [] },
    ]);
    const lMap = new Map((listings || []).map((l) => [l.id, l]));
    const bMap = new Map((buyers || []).map((u) => [u.id, u]));
    const rows = (data || []).map((r) => ({
      'Review ID': r.id,
      Service: (lMap.get(r.listing_id) || {}).title || '—',
      'From (Buyer)': (bMap.get(r.buyer_id) || {}).name || '—',
      Rating: `${r.rating}/5`,
      Comment: r.comment || '—',
      Date: new Date(r.created_at).toLocaleDateString(),
    }));
    return res.json({ title: 'Reviews Received', rows });
  }

  // ── Admin-only report types ──
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required.' });

  if (type === 'admin-users') {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, faculty, university, account_type, is_verified, is_suspended, xp, avg_rating, created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    const rows = (data || []).map((u) => ({
      'User ID': u.id,
      Name: u.name,
      Email: u.email,
      Faculty: u.faculty || '—',
      University: u.university || '—',
      Type: u.account_type || 'seller',
      Verified: u.is_verified ? 'Yes' : 'No',
      Suspended: u.is_suspended ? 'Yes' : 'No',
      XP: u.xp || 0,
      'Avg Rating': u.avg_rating ? Number(u.avg_rating).toFixed(1) : '—',
      'Joined': new Date(u.created_at).toLocaleDateString(),
    }));
    return res.json({ title: 'All Users', rows });
  }

  if (type === 'admin-listings') {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, category, price, price_type, is_available, views, created_at, seller_id')
      .order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    const sellerIds = [...new Set((data || []).map((l) => l.seller_id).filter(Boolean))];
    const { data: sellers } = sellerIds.length
      ? await supabase.from('users').select('id, name, email').in('id', sellerIds)
      : { data: [] };
    const sMap = new Map((sellers || []).map((u) => [u.id, u]));
    const rows = (data || []).map((l) => {
      const s = sMap.get(l.seller_id) || {};
      return {
        'Listing ID': l.id,
        Title: l.title,
        Category: l.category || '—',
        'Seller Name': s.name || '—',
        'Seller Email': s.email || '—',
        Price: l.price_type === 'negotiable' ? 'Negotiable' : l.price ? `R${Number(l.price).toFixed(2)}` : 'Free',
        Status: l.is_available === false ? 'Paused' : 'Live',
        Views: l.views || 0,
        'Created At': new Date(l.created_at).toLocaleDateString(),
      };
    });
    return res.json({ title: 'All Listings', rows });
  }

  if (type === 'admin-bookings') {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, agreed_price, created_at, listing_id, buyer_id, seller_id')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) return res.status(400).json({ error: error.message });
    const listingIds = [...new Set((data || []).map((o) => o.listing_id).filter(Boolean))];
    const userIds = [...new Set([
      ...(data || []).map((o) => o.buyer_id),
      ...(data || []).map((o) => o.seller_id),
    ].filter(Boolean))];
    const [{ data: listings }, { data: users }] = await Promise.all([
      listingIds.length ? supabase.from('listings').select('id, title').in('id', listingIds) : { data: [] },
      userIds.length ? supabase.from('users').select('id, name, email').in('id', userIds) : { data: [] },
    ]);
    const lMap = new Map((listings || []).map((l) => [l.id, l]));
    const uMap = new Map((users || []).map((u) => [u.id, u]));
    const rows = (data || []).map((o) => ({
      'Order ID': o.id,
      Service: (lMap.get(o.listing_id) || {}).title || '—',
      'Buyer Name': (uMap.get(o.buyer_id) || {}).name || '—',
      'Buyer Email': (uMap.get(o.buyer_id) || {}).email || '—',
      'Seller Name': (uMap.get(o.seller_id) || {}).name || '—',
      'Seller Email': (uMap.get(o.seller_id) || {}).email || '—',
      Status: o.status,
      'Agreed Price': o.agreed_price ? `R${Number(o.agreed_price).toFixed(2)}` : '—',
      Date: new Date(o.created_at).toLocaleDateString(),
    }));
    return res.json({ title: 'All Bookings', rows });
  }

  return res.status(400).json({ error: 'Invalid report type.' });
});

app.get('/pages/:page', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages', `${req.params.page}`));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
