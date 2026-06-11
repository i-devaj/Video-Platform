import otp from '../Modals/otp.js';
import { sendOTPEmail } from '../utils/sendEmail.js';
import { sendOTPSMS } from '../utils/sendSMS.js';

export const sendotp = async (req, res) => {
  try {
    const { email, phone, type } = req.body;
    const identifier = type === 'email' ? email : phone;
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing OTP for this identifier
    await otp.deleteMany({ identifier });

    // Save new OTP document
    await otp.create({ identifier, otp: code, type });

    // Send via the appropriate channel
    let testOtp = undefined;
    if (type === 'email') {
      const emailSent = await sendOTPEmail(identifier, code);
      if (!emailSent) {
        testOtp = code; // Fallback to test demo popup if env is not configured
      }
    } else {
      // For phone, we use a test demo approach where the OTP is shown as a popup
      testOtp = code;
      // We can also attempt to send SMS but it's optional now
      try {
        await sendOTPSMS(identifier, code);
      } catch (err) {
        console.warn('SMS failed, continuing with test OTP popup', err);
      }
    }

    res.status(200).json({ success: true, message: 'OTP sent', testOtp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyotp = async (req, res) => {
  try {
    const { identifier, otp: submittedOtp } = req.body;

    const record = await otp.findOne({ identifier, otp: submittedOtp });

    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await otp.deleteOne({ _id: record._id });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
