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
    if (type === 'email') {
      await sendOTPEmail(identifier, code);
    } else {
      await sendOTPSMS(identifier, code);
    }

    res.status(200).json({ success: true, message: 'OTP sent' });
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
