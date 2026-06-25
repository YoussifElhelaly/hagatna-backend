import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const TO = 'youssifelhelaly@shinefy.co';

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&family=Tajawal:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; background: #f4f6f8; font-family: 'Tajawal', 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%); padding: 32px 24px; text-align: center; }
    .logo { font-family: 'Cairo', sans-serif; font-size: 32px; font-weight: 800; color: #ffffff; }
    .logo span { color: #ff6b35; }
    .body { padding: 40px 24px; }
    h2 { font-family: 'Cairo', sans-serif; font-size: 22px; color: #1a1f3a; margin: 0 0 16px; }
    p { font-size: 16px; color: #555; line-height: 1.7; margin: 0 0 12px; }
    .badge { display: inline-block; background: #ff6b35; color: #fff; padding: 10px 28px; border-radius: 8px; font-family: 'Cairo', sans-serif; font-weight: 700; font-size: 16px; text-decoration: none; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 32px 0; }
    .footer { background: #f4f6f8; padding: 24px; text-align: center; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">Hag<span>atna.</span></div>
    </div>
    <div class="body">
      <h2>Test Email &mdash; SMTP Working!</h2>
      <p>This is a test email sent from the <strong>Hagatna</strong> backend to verify that the SMTP configuration is working correctly.</p>
      <p>If you received this email, your Nodemailer setup with <code>${process.env.SMTP_HOST}</code> is fully operational.</p>
      <p><strong>Recipient:</strong> ${TO}</p>
      <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
      <hr class="divider" />
      <p style="font-size:13px;color:#999;">Hagatna E-commerce &mdash; Automated Test</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Hagatna. All rights reserved.
    </div>
  </div>
</body>
</html>`;

async function main() {
  console.log(`SMTP Host : ${process.env.SMTP_HOST}`);
  console.log(`SMTP Port : ${process.env.SMTP_PORT}`);
  console.log(`SMTP User : ${process.env.SMTP_USER}`);
  console.log(`Email From: ${process.env.EMAIL_FROM}`);
  console.log(`Sending to: ${TO}`);
  console.log('---');

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: TO,
      subject: 'Hagatna - SMTP Test Email',
      html,
    });
    console.log('Message sent! ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error('Failed to send email:', err);
    process.exit(1);
  }
}

main();
