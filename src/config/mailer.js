const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
let resend = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

const requireResend = () => {
  if (!resend) {
    throw new Error('Missing RESEND_API_KEY in environment variables.');
  }
};

module.exports = { resend, requireResend };
