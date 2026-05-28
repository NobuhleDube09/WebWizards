const { supabase } = require('../config/supabase');

/**
 * Validates the Supabase Auth Bearer token from the Authorization header.
 * Attaches the profile row to req.user if valid.
 */
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing.' });
  }

  try {
    // Verify the Supabase JWT and get the auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    // Fetch the profile row
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, name, is_admin, is_suspended, account_type')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found.' });
    }

    if (profile.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    req.user = profile;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
