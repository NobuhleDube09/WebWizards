/**
 * CampusConnect — Seed Script
 * Populates the database with realistic listings and reviews.
 * Run once: node scripts/seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Existing users ───────────────────────────────────────────────────────────
const USERS = {
  admin:    '03f79968-6168-4880-89a2-610973510626',
  uj:       '099548f1-b86f-40c4-80f7-c38fa56864dc',   // 224177403@student.uj.ac.za
  qwabe:    'c72077c0-f82c-4ed2-b38d-d4271dc69fd3',   // qwabembongeni074@gmail.com
  wits:     'a277b371-211d-439c-b55f-7f89b4255428',   // student@wits.ac.za
};

// ── Update user profiles with better display names ───────────────────────────
const profileUpdates = [
  { id: USERS.uj,    name: 'Lihle Dlamini',  faculty: 'Engineering', year_of_study: 3, bio: 'Final-year Mechanical Engineering student. I tutor Maths, Physics and CAD.' },
  { id: USERS.qwabe, name: 'Qwabe Mbongeni', faculty: 'Commerce',    year_of_study: 2, bio: 'Commerce student specialising in digital marketing and graphic design.' },
  { id: USERS.wits,  name: 'Tumi Nkosi',     faculty: 'Science',     year_of_study: 4, bio: 'Computer Science & Statistics. Full-stack dev and data analyst for hire.' },
  { id: USERS.admin, name: 'Admin',           faculty: 'Admin',       year_of_study: 0, bio: 'Platform administrator.' },
];

// ── Listings ─────────────────────────────────────────────────────────────────
const listings = [
  // Lihle — Engineering / Tutoring
  {
    seller_id: USERS.uj,
    title: 'Maths & Physics Tutoring (Gr11–Uni)',
    description: 'I offer one-on-one tutoring for high school and first-year university Maths and Physics. Sessions are online via Google Meet or in-person at UJ Auckland Park. I have a 92% pass rate with my previous students.',
    category: 'Tutoring', price: 200, price_type: 'per_hour', delivery_method: 'both', turnaround_time: '1 day',
    status: 'approved', availability: true, is_featured: true,
  },
  {
    seller_id: USERS.uj,
    title: 'AutoCAD 2D & 3D Drawings',
    description: 'Professional AutoCAD drafting for engineering projects, architecture plans, and technical drawings. Fast turnaround — most projects delivered within 48 hours.',
    category: 'Tech Support', price: 350, price_type: 'fixed', delivery_method: 'online', turnaround_time: '2 days',
    status: 'approved', availability: true,
  },
  // Qwabe — Commerce / Creative
  {
    seller_id: USERS.qwabe,
    title: 'Logo & Brand Identity Design',
    description: 'I create modern, professional logos and full brand identity packages (logo, colour palette, typography guide, business card). Ideal for small businesses and student entrepreneurs.',
    category: 'Creative Arts', price: 450, price_type: 'fixed', delivery_method: 'online', turnaround_time: '3 days',
    status: 'approved', availability: true, is_featured: true,
  },
  {
    seller_id: USERS.qwabe,
    title: 'Social Media Content Creation',
    description: 'Struggling with content? I design branded posts, Reels covers, and Stories for Instagram, TikTok and Facebook. Packages start at 10 posts per month.',
    category: 'Creative Arts', price: 600, price_type: 'per_month', delivery_method: 'online', turnaround_time: '5 days',
    status: 'approved', availability: true,
  },
  {
    seller_id: USERS.qwabe,
    title: 'CV & Cover Letter Writing',
    description: 'ATS-optimised CVs and compelling cover letters tailored to your target industry. Includes free revision within 7 days.',
    category: 'Writing', price: 280, price_type: 'fixed', delivery_method: 'online', turnaround_time: '2 days',
    status: 'approved', availability: true,
  },
  // Tumi — CS / Tech
  {
    seller_id: USERS.wits,
    title: 'Python & Data Analysis Help',
    description: 'Need help with Python assignments, data science projects, or Pandas/NumPy tasks? I offer debugging sessions, code reviews and full project builds. Honours-level expertise.',
    category: 'Tech Support', price: 300, price_type: 'per_hour', delivery_method: 'online', turnaround_time: '1 day',
    status: 'approved', availability: true, is_featured: true,
  },
  {
    seller_id: USERS.wits,
    title: 'Web Development (HTML/CSS/JS)',
    description: 'Portfolio sites, landing pages and small web apps built from scratch. Clean code, mobile-responsive, and fast. React projects welcome too.',
    category: 'Tech Support', price: 800, price_type: 'fixed', delivery_method: 'online', turnaround_time: '7 days',
    status: 'approved', availability: true,
  },
  {
    seller_id: USERS.wits,
    title: 'Stats & Research Analysis (SPSS / R)',
    description: 'Full statistical analysis for dissertations and research projects. I handle data cleaning, descriptive stats, regression, ANOVA, and write-ups in APA format.',
    category: 'Writing', price: 500, price_type: 'fixed', delivery_method: 'online', turnaround_time: '3 days',
    status: 'approved', availability: true,
  },
  // Pending (needs admin approval)
  {
    seller_id: USERS.uj,
    title: 'Piano Lessons for Beginners',
    description: 'Learn piano from scratch with structured, fun lessons. I teach classical fundamentals, chords and popular songs. In-person only (Auckland Park area).',
    category: 'Music', price: 250, price_type: 'per_hour', delivery_method: 'in-person', turnaround_time: '1 day',
    status: 'pending', availability: true,
  },
];

async function seed() {
  console.log('=== CampusConnect Seed ===\n');

  // 1. Update profiles
  console.log('Updating user profiles...');
  for (const p of profileUpdates) {
    const { error } = await sb.from('users')
      .update({ name: p.name, faculty: p.faculty, year_of_study: p.year_of_study, bio: p.bio })
      .eq('id', p.id);
    if (error) console.log('  ERR', p.name, error.message);
    else console.log('  OK', p.name);
  }

  // 2. Insert listings
  console.log('\nInserting listings...');
  const { data: inserted, error: lErr } = await sb
    .from('listings')
    .insert(listings)
    .select('id, title, status');
  if (lErr) { console.log('  ERR', lErr.message); return; }
  inserted.forEach(l => console.log('  OK', l.status, '|', l.title));

  // 3. Add a couple of reviews (on approved listings)
  const approved = inserted.filter(l => l.status === 'approved');
  if (approved.length >= 2) {
    const reviewsData = [
      { listing_id: approved[0].id, buyer_id: USERS.qwabe, seller_id: USERS.uj,    rating: 5, comment: 'Excellent tutor! Very patient and explained concepts clearly. Highly recommended.' },
      { listing_id: approved[0].id, buyer_id: USERS.wits,  seller_id: USERS.uj,    rating: 4, comment: 'Good session, helped me understand the work before my test.' },
      { listing_id: approved[2].id, buyer_id: USERS.uj,    seller_id: USERS.qwabe, rating: 5, comment: 'Amazing design work! Delivered fast and nailed the brief completely.' },
      { listing_id: approved[5].id, buyer_id: USERS.uj,    seller_id: USERS.wits,  rating: 5, comment: 'Saved me before my deadline. Super professional and knows his stuff.' },
    ];
    console.log('\nInserting reviews...');
    const { error: rErr } = await sb.from('reviews').insert(reviewsData);
    if (rErr) console.log('  ERR', rErr.message);
    else console.log('  OK', reviewsData.length, 'reviews added');

    // Update avg_rating and review_count on those listings
    for (const { listing_id, seller_id } of reviewsData) {
      const { data: revs } = await sb.from('reviews').select('rating').eq('listing_id', listing_id);
      if (revs?.length) {
        const avg = revs.reduce((s, r) => s + r.rating, 0) / revs.length;
        await sb.from('listings').update({ rating_avg: avg, review_count: revs.length }).eq('id', listing_id);
      }
    }
    console.log('  Rating averages updated');

    // Update avg_rating on sellers
    for (const uid of [USERS.uj, USERS.qwabe, USERS.wits]) {
      const { data: sellerRevs } = await sb.from('reviews').select('rating').eq('seller_id', uid);
      if (sellerRevs?.length) {
        const avg = sellerRevs.reduce((s, r) => s + r.rating, 0) / sellerRevs.length;
        await sb.from('users').update({ avg_rating: avg }).eq('id', uid);
      }
    }
    console.log('  Seller ratings updated');
  }

  // 4. Add sample XP / listing_count updates for sellers
  const xpMap = { [USERS.uj]: 120, [USERS.qwabe]: 95, [USERS.wits]: 180 };
  for (const [id, xp] of Object.entries(xpMap)) {
    await sb.from('users').update({ xp }).eq('id', id);
  }
  console.log('\nXP updated for sellers');

  console.log('\n✅ Seed complete. Refresh the browser to see the data.\n');
}

seed().catch(console.error);
