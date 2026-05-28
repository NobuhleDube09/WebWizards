import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, name, action = 'register' } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const lowerEmail = email.toLowerCase();

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Fetch the user profile
    const { data: user } = await supabase
      .from('users')
      .select('id, name, is_verified')
      .eq('email', lowerEmail)
      .maybeSingle();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Account not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'resend' && user.is_verified) {
      return new Response(
        JSON.stringify({ error: 'Account already verified. Please log in.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const userName: string = name ?? user.name;

    // Generate 6-digit OTP, valid for 15 minutes
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store OTP in the users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ otp_code: otp, otp_expires_at: expiresAt })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to store verification code.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Send email via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const resendFrom = Deno.env.get('RESEND_FROM') ?? 'CampusConnect <noreply@mmqtech.co.za>';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: lowerEmail,
        subject: action === 'resend'
          ? 'Your new CampusConnect verification code'
          : 'Verify your CampusConnect account',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Verify your account</title>
</head>
<body style="margin:0;padding:0;background:#f3f5f4;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f5f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 24px rgba(0,0,0,.07);">

          <!-- Top accent bar -->
          <tr><td style="background:#00C97F;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Header / Logo -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #f3f5f4;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:40px;height:40px;background:#e6fff4;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:40px;">
                      <span style="font-size:22px;">🎓</span>
                    </div>
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <span style="font-size:1.05rem;font-weight:800;color:#111827;letter-spacing:-0.02em;">CampusConnect</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 28px;">

              <!-- Tag -->
              <div style="display:inline-block;background:#e6fff4;color:#00965d;font-size:0.7rem;font-weight:700;padding:4px 12px;border-radius:100px;border:1px solid rgba(0,201,127,.25);text-transform:uppercase;letter-spacing:.06em;margin-bottom:22px;">
                Verify your email
              </div>

              <h1 style="font-size:1.25rem;font-weight:800;color:#111827;margin:0 0 6px;letter-spacing:-0.02em;">
                ${action === 'resend' ? 'Here\'s your new code' : 'One step away!'}
              </h1>
              <p style="font-size:0.9rem;color:#4b5563;margin:0 0 28px;line-height:1.65;">
                Hi <strong>${userName}</strong>, use the code below to verify your account. It expires in <strong>15 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f7f4;border-radius:16px;margin-bottom:28px;">
                <tr>
                  <td style="padding:28px;text-align:center;">
                    <div style="font-size:3rem;font-weight:900;letter-spacing:14px;color:#00965d;font-family:'Courier New',monospace;line-height:1;">${otp}</div>
                    <p style="font-size:0.78rem;color:#9ca3af;margin:10px 0 0;">Expires in 15 minutes &nbsp;·&nbsp; Do not share this code</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#00C97F;border-radius:10px;">
                    <a href="https://campus-connect-sigma-seven.vercel.app/pages/get-started.html" style="display:inline-block;padding:12px 28px;font-size:0.88rem;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.01em;">
                      Open CampusConnect →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border:none;border-top:1px solid #f3f5f4;margin:0 0 20px;">

              <p style="font-size:0.8rem;color:#9ca3af;margin:0;line-height:1.6;">
                If you didn't sign up for CampusConnect, you can safely ignore this email — your address will not be used.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 36px 24px;text-align:center;font-size:0.75rem;color:#9ca3af;line-height:1.6;border-top:1px solid #f3f5f4;">
              You're receiving this because you signed up at CampusConnect.<br>
              <a href="https://campus-connect-sigma-seven.vercel.app" style="color:#00C97F;text-decoration:none;">Visit CampusConnect</a>
              &nbsp;·&nbsp;
              <a href="https://campus-connect-sigma-seven.vercel.app/pages/dashboard.html" style="color:#00C97F;text-decoration:none;">Your dashboard</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      }),
    });

    if (!emailRes.ok) {
      // Rollback the stored OTP on email failure
      await supabase
        .from('users')
        .update({ otp_code: null, otp_expires_at: null })
        .eq('id', user.id);

      const emailErr = await emailRes.json();
      console.error('Resend error:', emailErr);

      return new Response(
        JSON.stringify({ error: 'Failed to send verification email. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ message: 'Code sent! Check your email.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-otp error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
