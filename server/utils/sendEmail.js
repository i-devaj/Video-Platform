import nodemailer from 'nodemailer';

const isEmailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

function ensureTransporter() {
  if (!transporter) {
    console.warn('[Email] Skipping — EMAIL_USER / EMAIL_PASS not configured in .env');
    return false;
  }
  return true;
}

export const sendOTPEmail = async (toEmail, otp) => {
  if (!ensureTransporter()) return;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'FlexTube Login OTP',
    html: `<p>Your FlexTube login OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  });
};

export const sendInvoiceEmail = async (toEmail, data) => {
  if (!ensureTransporter()) return;
  const { userName, planName, amount, transactionId, invoiceNumber, date } = data;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `FlexTube — ${planName} Upgrade Confirmation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">FlexTube Plan Upgrade</h2>
        <p style="color: #555;">Hi ${userName},</p>
        <p style="color: #555;">Your plan has been upgraded to <strong>${planName}</strong>. Here are your invoice details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #888;">Invoice #</td>
            <td style="padding: 8px 0; font-weight: bold;">${invoiceNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #888;">Plan</td>
            <td style="padding: 8px 0; font-weight: bold;">${planName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #888;">Amount</td>
            <td style="padding: 8px 0; font-weight: bold;">₹${(amount / 100).toFixed(2)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0; color: #888;">Transaction ID</td>
            <td style="padding: 8px 0; font-family: monospace; font-size: 13px;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Date</td>
            <td style="padding: 8px 0;">${date}</td>
          </tr>
        </table>
        <p style="color: #888; font-size: 13px;">Thank you for upgrading! Enjoy your enhanced viewing experience.</p>
      </div>
    `,
  });
};
