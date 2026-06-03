/**
 * CampusConnect — Email Notification Service
 * Beautiful transactional emails for every user action.
 */

const { resend } = require('../config/mailer');

const FROM = process.env.RESEND_FROM || 'CampusConnect <noreply@mmqtech.co.za>';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const BRAND = '#00C97F';
const BRAND_D = '#00a868';

// ── Base HTML shell ──────────────────────────────────────────────────────────
const baseHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f3f5f4; font-family:'Inter',Arial,sans-serif; -webkit-font-smoothing:antialiased; }
    .wrapper { max-width:580px; margin:32px auto; background:#f3f5f4; padding:0 16px 40px; }
    .card { background:#fff; border-radius:18px; border:1px solid #e5e7eb; overflow:hidden; }
    .top-bar { background:${BRAND}; height:5px; }
    .header { padding:28px 32px 20px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #f3f5f4; }
    .logo-box { width:40px; height:40px; background:#e6fff4; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; }
    .logo-name { font-weight:800; font-size:1rem; color:#111827; letter-spacing:-0.02em; }
    .body { padding:28px 32px; }
    .greeting { font-size:1rem; font-weight:700; color:#111827; margin-bottom:4px; }
    .lead { font-size:.92rem; color:#4b5563; line-height:1.6; margin-bottom:20px; }
    .box { background:#f8faf9; border:1px solid #e5e7eb; border-radius:12px; padding:16px 18px; margin-bottom:18px; }
    .box-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#9ca3af; margin-bottom:4px; }
    .box-value { font-size:.95rem; font-weight:600; color:#111827; }
    .btn { display:inline-block; background:${BRAND}; color:#fff !important; text-decoration:none; padding:11px 26px; border-radius:10px; font-weight:700; font-size:.88rem; letter-spacing:.01em; margin-top:4px; }
    .btn:hover { background:${BRAND_D}; }
    .divider { height:1px; background:#f3f5f4; margin:20px 0; }
    .footer { padding:16px 32px 24px; text-align:center; font-size:.75rem; color:#9ca3af; line-height:1.6; }
    .footer a { color:${BRAND}; text-decoration:none; }
    .tag { display:inline-block; background:#e6fff4; color:${BRAND_D}; font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:999px; border:1px solid rgba(0,201,127,.25); text-transform:uppercase; letter-spacing:.05em; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="top-bar"></div>
      <div class="header">
        <div class="logo-box">🎓</div>
        <span class="logo-name">CampusConnect</span>
      </div>
      <div class="body">
        ${bodyContent}
      </div>
      <div class="footer">
        You're receiving this because you have a CampusConnect account.<br>
        <a href="${BASE_URL}">Visit CampusConnect</a> &nbsp;·&nbsp;
        <a href="${BASE_URL}/pages/dashboard.html">Your dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`;

// ── Fire-and-forget helper ────────────────────────────────────────────────────
const send = (to, subject, html) => {
  try {
    requireResend();
    resend.emails.send({ from: FROM, to, subject, html }).catch((err) => {
      console.error(`[email] Failed to send "${subject}" to ${to}:`, err.message);
    });
  } catch (err) {
    console.error(`[email] Cannot send "${subject}" to ${to}:`, err.message);
  }
};

// ── Awaitable send (for critical emails like OTP) ─────────────────────────────
const sendAwait = (to, subject, html) => {
  requireResend();
  return resend.emails.send({ from: FROM, to, subject, html });
};

// ── 1. Welcome / Registration ─────────────────────────────────────────────────
exports.sendWelcomeEmail = (user) => {
  const html = baseHtml('Welcome to CampusConnect!', `
    <div class="tag">Welcome</div>
    <br><br>
    <div class="greeting">Hey ${user.name} 👋</div>
    <p class="lead">
      Your CampusConnect account has been created! You're joining a network of
      talented students offering and discovering services on campus.
    </p>
    <div class="box">
      <div class="box-label">Your account</div>
      <div class="box-value">${user.email}</div>
    </div>
    <p class="lead" style="margin-bottom:8px">
      Check your email for a verification code to activate your account.
    </p>
    <a class="btn" href="${BASE_URL}/pages/verify.html">Verify my account</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280;line-height:1.55">
      Once verified you can browse services, create listings, and start earning on campus.
    </p>
  `);
  send(user.email, 'Welcome to CampusConnect! 🎓', html);
};

// ── OTP / Verification Code ───────────────────────────────────────────────────
exports.sendOTPEmail = (user, otp) => {
  const html = baseHtml('Your CampusConnect verification code', `
    <div class="tag">Verify your email</div>
    <br><br>
    <div class="greeting">Hi ${user.name} 👋</div>
    <p class="lead">Enter this code in the app to activate your account. It expires in 15 minutes.</p>
    <div style="background:#f4f7f4;border-radius:14px;padding:28px;text-align:center;margin-bottom:20px">
      <p style="font-size:2.8rem;font-weight:900;letter-spacing:12px;color:#00965d;margin:0;font-family:monospace">${otp}</p>
      <p style="font-size:0.78rem;color:#9ca3af;margin:10px 0 0">Expires in 15 minutes</p>
    </div>
    <p style="font-size:.83rem;color:#9ca3af;text-align:center">
      If you didn't create a CampusConnect account, you can safely ignore this email.
    </p>
  `);
  return sendAwait(user.email, 'Your CampusConnect verification code', html);
};

// ── 2. Email Verified ─────────────────────────────────────────────────────────
exports.sendVerificationSuccessEmail = (user) => {
  const html = baseHtml('Email verified!', `
    <div class="tag">Verified ✓</div>
    <br><br>
    <div class="greeting">You're all set, ${user.name}!</div>
    <p class="lead">
      Your email has been verified successfully. Your CampusConnect account is now fully active.
    </p>
    <a class="btn" href="${BASE_URL}/pages/login.html">Log in now</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280;line-height:1.55">
      Start by browsing services from other students or creating your own listing.
    </p>
  `);
  send(user.email, '✅ Email verified — CampusConnect', html);
};

// ── 3. Profile Updated ────────────────────────────────────────────────────────
exports.sendProfileUpdatedEmail = (user) => {
  const html = baseHtml('Profile updated', `
    <div class="tag">Profile</div>
    <br><br>
    <div class="greeting">Profile updated, ${user.name}</div>
    <p class="lead">Your CampusConnect profile was just updated successfully.</p>
    <div class="box">
      <div class="box-label">Name</div>
      <div class="box-value">${user.name}</div>
    </div>
    ${user.bio ? `<div class="box"><div class="box-label">Bio</div><div class="box-value" style="font-weight:400;font-size:.88rem">${user.bio}</div></div>` : ''}
    <a class="btn" href="${BASE_URL}/pages/dashboard.html">View dashboard</a>
    <div class="divider"></div>
    <p style="font-size:.8rem;color:#9ca3af">If you didn't make this change, please contact support immediately.</p>
  `);
  send(user.email, 'Your CampusConnect profile was updated', html);
};

// ── 4. Avatar Updated ─────────────────────────────────────────────────────────
exports.sendAvatarUpdatedEmail = (user) => {
  const html = baseHtml('Profile photo updated', `
    <div class="tag">Avatar</div>
    <br><br>
    <div class="greeting">New profile photo, ${user.name}!</div>
    <p class="lead">Your profile photo has been updated successfully on CampusConnect.</p>
    <a class="btn" href="${BASE_URL}/pages/dashboard.html">View your profile</a>
    <div class="divider"></div>
    <p style="font-size:.8rem;color:#9ca3af">If you didn't make this change, please contact support immediately.</p>
  `);
  send(user.email, 'Profile photo updated — CampusConnect', html);
};

// ── 5. Listing Created ────────────────────────────────────────────────────────
exports.sendListingCreatedEmail = (user, listing) => {
  const priceStr = listing.price ? `R${Number(listing.price).toFixed(2)}` : listing.price_type || 'Negotiable';
  const html = baseHtml('Your service is live!', `
    <div class="tag">New listing</div>
    <br><br>
    <div class="greeting">Your service is live, ${user.name}! 🚀</div>
    <p class="lead">Your new service listing has been published to the marketplace and is visible to all students.</p>
    <div class="box">
      <div class="box-label">Service title</div>
      <div class="box-value">${listing.title}</div>
    </div>
    <div class="box">
      <div class="box-label">Category</div>
      <div class="box-value">${listing.category}</div>
    </div>
    <div class="box">
      <div class="box-label">Price</div>
      <div class="box-value" style="color:${BRAND}">${priceStr}</div>
    </div>
    <a class="btn" href="${BASE_URL}/pages/listing.html?id=${listing.id}">View your listing</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280;line-height:1.55">
      You'll receive an email whenever a student books your service. Good luck!
    </p>
  `);
  send(user.email, `Your service "${listing.title}" is now live! 🚀`, html);
};

// ── 6. Listing Updated ────────────────────────────────────────────────────────
exports.sendListingUpdatedEmail = (user, listing) => {
  const html = baseHtml('Listing updated', `
    <div class="tag">Listing updated</div>
    <br><br>
    <div class="greeting">Listing updated, ${user.name}</div>
    <p class="lead">Your service listing has been updated successfully on CampusConnect.</p>
    <div class="box">
      <div class="box-label">Service</div>
      <div class="box-value">${listing.title}</div>
    </div>
    <a class="btn" href="${BASE_URL}/pages/listing.html?id=${listing.id}">View listing</a>
  `);
  send(user.email, `Listing updated: "${listing.title}"`, html);
};

// ── 7. Listing Availability Toggled ──────────────────────────────────────────
exports.sendListingToggledEmail = (user, listing) => {
  const isLive = listing.is_available !== false;
  const html = baseHtml(`Listing ${isLive ? 'activated' : 'paused'}`, `
    <div class="tag">${isLive ? 'Activated' : 'Paused'}</div>
    <br><br>
    <div class="greeting">Listing ${isLive ? 'activated' : 'paused'}, ${user.name}</div>
    <p class="lead">
      Your service listing <strong>"${listing.title}"</strong> has been
      ${isLive ? '<strong style="color:' + BRAND + '">activated</strong> and is now visible in the marketplace.' : '<strong style="color:#ef4444">paused</strong> and is temporarily hidden from the marketplace.'}
    </p>
    <a class="btn" href="${BASE_URL}/pages/dashboard.html">Manage listings</a>
  `);
  send(user.email, `Listing "${listing.title}" ${isLive ? 'is now live' : 'has been paused'}`, html);
};

// ── 8. Listing Deleted ────────────────────────────────────────────────────────
exports.sendListingDeletedEmail = (user, listingTitle) => {
  const html = baseHtml('Listing deleted', `
    <div class="tag">Deleted</div>
    <br><br>
    <div class="greeting">Listing removed, ${user.name}</div>
    <p class="lead">Your listing <strong>"${listingTitle}"</strong> has been permanently deleted from CampusConnect.</p>
    <a class="btn" href="${BASE_URL}/pages/listing-form.html">Create a new listing</a>
    <div class="divider"></div>
    <p style="font-size:.8rem;color:#9ca3af">If you didn't do this, please contact support immediately.</p>
  `);
  send(user.email, `Listing "${listingTitle}" has been deleted`, html);
};

// ── 9. New Booking — to Seller ────────────────────────────────────────────────
exports.sendNewBookingToSeller = (seller, buyer, listing, order) => {
  const html = baseHtml('New booking request!', `
    <div class="tag">New booking</div>
    <br><br>
    <div class="greeting">You have a new booking, ${seller.name}! 🎉</div>
    <p class="lead">A student wants to book your service. Respond quickly to earn a fast-response XP bonus!</p>
    <div class="box">
      <div class="box-label">Service requested</div>
      <div class="box-value">${listing.title}</div>
    </div>
    <div class="box">
      <div class="box-label">From</div>
      <div class="box-value">${buyer.name} (${buyer.email})</div>
    </div>
    ${order.buyer_message ? `<div class="box"><div class="box-label">Message</div><div class="box-value" style="font-weight:400;font-size:.88rem">${order.buyer_message}</div></div>` : ''}
    ${order.preferred_datetime ? `<div class="box"><div class="box-label">Preferred time</div><div class="box-value">${new Date(order.preferred_datetime).toLocaleString()}</div></div>` : ''}
    <a class="btn" href="${BASE_URL}/pages/dashboard.html">Accept or decline</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280">Responding within 1 hour earns you +5 XP.</p>
  `);
  send(seller.email, `New booking request for "${listing.title}" 🎉`, html);
};

// ── 10. Booking Accepted — to Buyer ──────────────────────────────────────────
exports.sendBookingAcceptedToBuyer = (buyer, seller, listing, order) => {
  const html = baseHtml('Booking accepted!', `
    <div class="tag" style="background:#e6fff4;color:${BRAND_D}">Accepted ✓</div>
    <br><br>
    <div class="greeting">Your booking was accepted, ${buyer.name}! ✅</div>
    <p class="lead"><strong>${seller.name}</strong> has accepted your booking for <strong>"${listing.title}"</strong>.</p>
    <div class="box">
      <div class="box-label">Service</div>
      <div class="box-value">${listing.title}</div>
    </div>
    <div class="box">
      <div class="box-label">Seller</div>
      <div class="box-value">${seller.name}</div>
    </div>
    ${order.agreed_price ? `<div class="box"><div class="box-label">Agreed price</div><div class="box-value" style="color:${BRAND}">R${Number(order.agreed_price).toFixed(2)}</div></div>` : ''}
    ${order.deadline ? `<div class="box"><div class="box-label">Deadline</div><div class="box-value">${new Date(order.deadline).toLocaleString()}</div></div>` : ''}
    <a class="btn" href="${BASE_URL}/pages/inbox.html">Message ${seller.name}</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280">Once the work is done, mark the order as complete so you can leave a review.</p>
  `);
  send(buyer.email, `✅ Booking accepted: "${listing.title}"`, html);
};

// ── 11. Booking Declined — to Buyer ──────────────────────────────────────────
exports.sendBookingDeclinedToBuyer = (buyer, seller, listing) => {
  const html = baseHtml('Booking declined', `
    <div class="tag" style="background:rgba(239,68,68,.1);color:#ef4444">Declined</div>
    <br><br>
    <div class="greeting">Booking update for ${buyer.name}</div>
    <p class="lead">Unfortunately, <strong>${seller.name}</strong> was unable to accept your booking for <strong>"${listing.title}"</strong> at this time.</p>
    <div class="box">
      <div class="box-label">Service</div>
      <div class="box-value">${listing.title}</div>
    </div>
    <a class="btn" href="${BASE_URL}/pages/browse.html">Browse other services</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280">Don't worry — there are many talented students on CampusConnect ready to help you.</p>
  `);
  send(buyer.email, `Booking update: "${listing.title}"`, html);
};

// ── 12. Order Completed — to Seller ──────────────────────────────────────────
exports.sendOrderCompletedToSeller = (seller, buyer, listing, order) => {
  const html = baseHtml('Order completed!', `
    <div class="tag">Completed 🏆</div>
    <br><br>
    <div class="greeting">Order complete, ${seller.name}! 🏆</div>
    <p class="lead"><strong>${buyer.name}</strong> has marked your service as completed. Well done!</p>
    <div class="box">
      <div class="box-label">Service</div>
      <div class="box-value">${listing.title}</div>
    </div>
    ${order.agreed_price ? `<div class="box"><div class="box-label">Earnings added</div><div class="box-value" style="color:${BRAND}">+R${Number(order.agreed_price).toFixed(2)}</div></div>` : ''}
    <div class="box">
      <div class="box-label">XP earned</div>
      <div class="box-value" style="color:${BRAND}">+10 XP</div>
    </div>
    <a class="btn" href="${BASE_URL}/pages/dashboard.html">View your earnings</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280">The buyer may leave a review. A 5-star review earns you an additional +20 XP.</p>
  `);
  send(seller.email, `Order complete: "${listing.title}" 🏆`, html);
};

// ── 13. New Message Received ──────────────────────────────────────────────────
exports.sendNewMessageEmail = (recipient, sender, messagePreview) => {
  const preview = messagePreview.length > 120
    ? messagePreview.slice(0, 117) + '...'
    : messagePreview;
  const html = baseHtml('New message', `
    <div class="tag">Message</div>
    <br><br>
    <div class="greeting">New message from ${sender.name}</div>
    <p class="lead">You have a new message on CampusConnect.</p>
    <div class="box">
      <div class="box-label">From</div>
      <div class="box-value">${sender.name}</div>
    </div>
    <div class="box">
      <div class="box-label">Message preview</div>
      <div class="box-value" style="font-weight:400;font-size:.88rem;color:#4b5563;font-style:italic">"${preview}"</div>
    </div>
    <a class="btn" href="${BASE_URL}/pages/inbox.html">Reply now</a>
  `);
  send(recipient.email, `💬 New message from ${sender.name}`, html);
};

// ── 14. Review Received — to Seller ──────────────────────────────────────────
exports.sendReviewReceivedEmail = (seller, buyer, listing, review) => {
  const stars = '★'.repeat(Math.round(review.rating)) + '☆'.repeat(5 - Math.round(review.rating));
  const html = baseHtml('New review!', `
    <div class="tag">New review ⭐</div>
    <br><br>
    <div class="greeting">You received a review, ${seller.name}!</div>
    <p class="lead"><strong>${buyer.name}</strong> left a review for your service <strong>"${listing.title}"</strong>.</p>
    <div class="box">
      <div class="box-label">Rating</div>
      <div class="box-value" style="color:#f59e0b;font-size:1.1rem">${stars} &nbsp;${review.rating}/5</div>
    </div>
    <div class="box">
      <div class="box-label">Review</div>
      <div class="box-value" style="font-weight:400;font-size:.88rem;color:#4b5563;line-height:1.55;font-style:italic">"${review.content}"</div>
    </div>
    <a class="btn" href="${BASE_URL}/pages/listing.html?id=${listing.id}">View &amp; reply</a>
    <div class="divider"></div>
    <p style="font-size:.83rem;color:#6b7280">You can reply to this review from your listing page.</p>
  `);
  send(seller.email, `⭐ New ${review.rating}-star review for "${listing.title}"`, html);
};
