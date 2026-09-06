const nodemailer = require('nodemailer');

const sendOtpEmail = async (toEmail, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n========================================`);
      console.log(`[NearFix DEV EMAIL SERVICE]`);
      console.log(`To: ${toEmail}`);
      console.log(`6-Digit Verification Code: ${otp}`);
      console.log(`Note: Configure EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env for live SMTP delivery.`);
      console.log(`========================================\n`);
      return { success: true, simulated: true };
    } else {
      throw new Error('Email service credentials are not configured.');
    }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  const mailOptions = {
    from: `"NearFix Security" <${emailUser}>`,
    to: toEmail,
    subject: `Your NearFix Verification Code: ${otp}`,
    text: `Your NearFix 6-digit verification code is: ${otp}. This code is valid for 5 minutes. Please do not share it with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">NearFix</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Hyperlocal On-Demand Home Services</p>
        </div>
        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">Use the verification code below to complete your registration:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; background: #ffffff; display: inline-block; padding: 12px 24px; border-radius: 8px; border: 1px solid #cbd5e1;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 12px 0 0 0;">This code is valid for <b>5 minutes</b>.</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
          If you did not request this code, please disregard this email. Never share your verification code with anyone.
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
};

module.exports = { sendOtpEmail };
