import dotenv from 'dotenv';
import path from 'path';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TO = 'youssifelhelaly@shinefy.co';

async function main() {
  // 1. Verify SMTP connection
  console.log('=== SMTP Verification ===');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
    logger: true,
    debug: true,
  });

  try {
    const verify = await transporter.verify();
    console.log('SMTP connection verified:', verify);
  } catch (err) {
    console.error('SMTP verification FAILED:', err);
    return;
  }

  // 2. Send with envelope info to see delivery details
  console.log('\n=== Sending Test Email ===');
  try {
    const info = await transporter.sendMail({
      from: `"Hagatna Test" <${process.env.SMTP_USER}>`,
      to: TO,
      subject: 'Hagatna SMTP Test - ' + new Date().toISOString(),
      text: 'This is a plain text test email from Hagatna backend.',
      html: '<h1>Hagatna SMTP Test</h1><p>If you see this, email delivery is working.</p><p>Sent at: ' + new Date().toISOString() + '</p>',
      envelope: {
        from: process.env.SMTP_USER,
        to: TO,
      },
    });

    console.log('Message ID:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('Pending:', info.pending);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('Send FAILED:', err);
  }
}

main();
