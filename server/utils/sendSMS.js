import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOTPSMS = async (toPhone, otp) => {
  await client.messages.create({
    body: `Your FlexTube login OTP is ${otp}. It expires in 5 minutes.`,
    from: process.env.TWILIO_FROM_NUMBER,
    to: toPhone,
  });
};
