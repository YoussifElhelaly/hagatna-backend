import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { env } from '@config/env';
import { sendSuccess } from '@shared/utils/ApiResponse';
import { asyncHandler } from '@shared/utils/asyncHandler';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  const to = (req.body.to as string) || 'youssifelhelaly@shinefy.co';
  const subject = (req.body.subject as string) || 'Hagatna - Test Email';

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { margin: 0; padding: 0; background: #f4f6f8; font-family: 'Segoe UI', sans-serif; }
      .wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
      .header { background: linear-gradient(135deg, #1a1f3a 0%, #2d3561 100%); padding: 32px 24px; text-align: center; }
      .logo { font-size: 32px; font-weight: 800; color: #ffffff; }
      .logo span { color: #ff6b35; }
      .body { padding: 40px 24px; }
      h2 { font-size: 22px; color: #1a1f3a; margin: 0 0 16px; }
      p { font-size: 16px; color: #555; line-height: 1.7; margin: 0 0 12px; }
      .info { background: #f8f9fa; border-left: 4px solid #ff6b35; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .info p { margin: 4px 0; font-size: 14px; }
      .footer { background: #f4f6f8; padding: 24px; text-align: center; font-size: 13px; color: #999; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="header"><div class="logo">Hag<span>atna.</span></div></div>
      <div class="body">
        <h2>Test Email - SMTP Working!</h2>
        <p>This is a test email sent from the <strong>Hagatna</strong> backend.</p>
        <div class="info">
          <p><strong>SMTP Host:</strong> ${env.SMTP_HOST}:${env.SMTP_PORT}</p>
          <p><strong>From:</strong> ${env.EMAIL_FROM}</p>
          <p><strong>To:</strong> ${to}</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
        </div>
        <p>If you received this email, your SMTP configuration is working correctly.</p>
      </div>
      <div class="footer">&copy; ${new Date().getFullYear()} Hagatna. All rights reserved.</div>
    </div>
  </body>
  </html>`;

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  sendSuccess({
    res,
    message: 'Test email sent successfully',
    data: {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      response: info.response,
      envelope: info.envelope,
    },
  });
});
