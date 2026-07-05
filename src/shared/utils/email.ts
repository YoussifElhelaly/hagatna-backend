import nodemailer from 'nodemailer';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';

// ─── Transporter ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ─── HTML Escaping ────────────────────────────────────────────────────────────
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── Design System Tokens ─────────────────────────────────────────────────────
const DS = {
  // Brand colors
  navy:        '#000666',
  navyAlt:     '#1A237E',
  cta:         '#FF6D00',
  ctaDark:     '#C04300',
  secondary:   '#1B6D24',
  error:       '#BA1A1A',

  // Semantic
  onSurface:      '#1A1C1C',
  onSurfaceVar:   '#454652',
  outline:        '#767683',
  errorSurface:   '#FFDAD6',
  successSurface: '#A0F399',
  successOn:      '#217128',

  // Surfaces
  surface:      '#FFFFFF',
  surfaceBand:  '#F3F3F3',
  surfaceBg:    '#F9F9F9',

  // Typography
  fontHeadline: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
  fontBody:     "'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif",

  // Radius
  radiusMd: '12px',
  radiusLg: '20px',
  radiusFull: '9999px',
} as const;

// ─── Base Template ────────────────────────────────────────────────────────────
const baseTemplate = (contentEn: string, contentAr: string): string => `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${DS.fontBody};
      background: ${DS.surfaceBg};
      color: ${DS.onSurface};
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 32px auto;
      background: ${DS.surface};
      border-radius: ${DS.radiusLg};
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(26,28,28,.04), 0 8px 16px rgba(26,28,28,.06), 0 16px 32px rgba(26,28,28,.08);
    }

    /* ── Header ────────────────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, ${DS.navyAlt} 0%, ${DS.navy} 55%, #000444 100%);
      padding: 32px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 120px; height: 120px;
      background: rgba(255,109,0,0.13);
      border-radius: 50%;
      filter: blur(40px);
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -30px; left: -30px;
      width: 100px; height: 100px;
      background: rgba(27,109,36,0.12);
      border-radius: 50%;
      filter: blur(35px);
    }
    .header h1 {
      font-family: ${DS.fontHeadline};
      color: #fff;
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      position: relative;
      z-index: 1;
    }
    .header h1 .dot {
      color: ${DS.cta};
    }
    .header p {
      color: rgba(255,255,255,0.7);
      font-family: ${DS.fontBody};
      font-size: 13px;
      font-weight: 400;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }

    /* ── Body ──────────────────────────────────────────────── */
    .body { padding: 40px; }

    /* ── Section Label ─────────────────────────────────────── */
    .section-label {
      font-family: ${DS.fontHeadline};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${DS.outline};
      margin-bottom: 8px;
    }

    /* ── Headings ──────────────────────────────────────────── */
    h2 {
      font-family: ${DS.fontHeadline};
      font-size: 22px;
      font-weight: 800;
      color: ${DS.onSurface};
      line-height: 1.3;
      margin-bottom: 12px;
    }
    h3 {
      font-family: ${DS.fontHeadline};
      font-size: 18px;
      font-weight: 700;
      color: ${DS.onSurface};
      line-height: 1.3;
      margin-bottom: 8px;
    }

    /* ── Body Text ─────────────────────────────────────────── */
    p, td {
      font-family: ${DS.fontBody};
      font-size: 15px;
      font-weight: 400;
      color: ${DS.onSurfaceVar};
      line-height: 1.7;
    }

    /* ── Buttons ───────────────────────────────────────────── */
    .btn-cta {
      display: inline-block;
      background: ${DS.cta};
      color: #fff;
      font-family: ${DS.fontBody};
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: ${DS.radiusMd};
      text-decoration: none;
      box-shadow: 0 8px 24px rgba(255,109,0,0.25);
      transition: filter 0.2s;
    }
    .btn-cta:hover { filter: brightness(1.08); }

    .btn-primary {
      display: inline-block;
      background: ${DS.navy};
      color: #fff;
      font-family: ${DS.fontBody};
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: ${DS.radiusMd};
      text-decoration: none;
    }
    .btn-primary:hover { background: ${DS.navyAlt}; }

    /* ── Cards ─────────────────────────────────────────────── */
    .card {
      background: ${DS.surfaceBand};
      border-radius: ${DS.radiusMd};
      padding: 20px;
      margin: 20px 0;
    }

    /* ── Info Row ──────────────────────────────────────────── */
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(118,118,131,0.12);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      font-family: ${DS.fontBody};
      font-size: 14px;
      color: ${DS.outline};
      font-weight: 500;
    }
    .info-value {
      font-family: ${DS.fontBody};
      font-size: 14px;
      color: ${DS.onSurface};
      font-weight: 700;
    }

    /* ── OTP Block ─────────────────────────────────────────── */
    .otp-block {
      background: ${DS.navy};
      border-radius: ${DS.radiusMd};
      padding: 28px 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-family: ${DS.fontBody};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.7);
      margin-bottom: 10px;
    }
    .otp-code {
      font-family: ${DS.fontHeadline};
      font-size: 44px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 12px;
    }
    .otp-expire {
      font-family: ${DS.fontBody};
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      margin-top: 8px;
    }

    /* ── Status Badge ──────────────────────────────────────── */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: ${DS.radiusFull};
      font-family: ${DS.fontBody};
      font-size: 12px;
      font-weight: 700;
    }
    .badge-success {
      background: ${DS.successSurface};
      color: ${DS.successOn};
    }
    .badge-error {
      background: ${DS.errorSurface};
      color: ${DS.error};
    }
    .badge-warning {
      background: rgba(255,109,0,0.12);
      color: ${DS.ctaDark};
    }
    .badge-primary {
      background: rgba(0,6,102,0.08);
      color: ${DS.navy};
    }

    /* ── Divider ───────────────────────────────────────────── */
    .divider {
      border: none;
      border-top: 1px solid rgba(118,118,131,0.12);
      margin: 24px 0;
    }

    /* ── Footer ────────────────────────────────────────────── */
    .footer {
      background: ${DS.surfaceBand};
      padding: 24px 40px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: ${DS.outline};
      line-height: 1.8;
    }
    .footer a {
      color: ${DS.navy};
      text-decoration: none;
    }

    /* ── Arabic Section ────────────────────────────────────── */
    .ar-section {
      direction: rtl;
      text-align: right;
      padding-top: 20px;
    }
    .ar-section h2 {
      font-family: ${DS.fontHeadline};
      direction: rtl;
    }
    .ar-section p {
      font-family: ${DS.fontBody};
      direction: rtl;
    }

    /* ── Utility ───────────────────────────────────────────── */
    .text-center { text-align: center; }
    .mt-4 { margin-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
    .mb-6 { margin-bottom: 24px; }
    .text-muted { color: ${DS.outline}; font-size: 13px; }
    .text-cta { color: ${DS.cta}; font-weight: 700; }
    .text-navy { color: ${DS.navy}; font-weight: 700; }

    /* ── Product Row ───────────────────────────────────────── */
    .product-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(118,118,131,0.08);
    }
    .product-row:last-child { border-bottom: none; }
    .product-img {
      width: 56px;
      height: 56px;
      border-radius: ${DS.radiusMd};
      background: ${DS.surfaceBand};
      object-fit: cover;
    }
    .product-info { flex: 1; }
    .product-name {
      font-family: ${DS.fontHeadline};
      font-size: 14px;
      font-weight: 700;
      color: ${DS.onSurface};
    }
    .product-meta {
      font-size: 13px;
      color: ${DS.outline};
    }
    .product-price {
      font-family: ${DS.fontHeadline};
      font-size: 15px;
      font-weight: 800;
      color: ${DS.cta};
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Hagatna<span class="dot">.</span></h1>
      <p>Multi-Vendor E-commerce Platform</p>
    </div>
    <div class="body">
      <div class="english">${contentEn}</div>
      <hr class="divider"/>
      <div class="ar-section">${contentAr}</div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Hagatna. All rights reserved.<br/>
      If you did not request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>
`;

// ─── Single-Language Template (for emails that are only in one language) ──────
const singleTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${DS.fontBody};
      background: ${DS.surfaceBg};
      color: ${DS.onSurface};
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 32px auto;
      background: ${DS.surface};
      border-radius: ${DS.radiusLg};
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(26,28,28,.04), 0 8px 16px rgba(26,28,28,.06), 0 16px 32px rgba(26,28,28,.08);
    }
    .header {
      background: linear-gradient(135deg, ${DS.navyAlt} 0%, ${DS.navy} 55%, #000444 100%);
      padding: 32px 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 120px; height: 120px;
      background: rgba(255,109,0,0.13);
      border-radius: 50%;
      filter: blur(40px);
    }
    .header h1 {
      font-family: ${DS.fontHeadline};
      color: #fff;
      font-size: 28px;
      font-weight: 900;
      position: relative;
      z-index: 1;
    }
    .header h1 .dot { color: ${DS.cta}; }
    .header p {
      color: rgba(255,255,255,0.7);
      font-size: 13px;
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }
    .body { padding: 40px; }
    h2 {
      font-family: ${DS.fontHeadline};
      font-size: 22px;
      font-weight: 800;
      color: ${DS.onSurface};
      margin-bottom: 12px;
    }
    p {
      font-family: ${DS.fontBody};
      font-size: 15px;
      color: ${DS.onSurfaceVar};
      line-height: 1.7;
    }
    .btn-cta {
      display: inline-block;
      background: ${DS.cta};
      color: #fff;
      font-family: ${DS.fontBody};
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: ${DS.radiusMd};
      text-decoration: none;
      box-shadow: 0 8px 24px rgba(255,109,0,0.25);
    }
    .btn-primary {
      display: inline-block;
      background: ${DS.navy};
      color: #fff;
      font-family: ${DS.fontBody};
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: ${DS.radiusMd};
      text-decoration: none;
    }
    .card {
      background: ${DS.surfaceBand};
      border-radius: ${DS.radiusMd};
      padding: 20px;
      margin: 20px 0;
    }
    .otp-block {
      background: ${DS.navy};
      border-radius: ${DS.radiusMd};
      padding: 28px 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.7);
      margin-bottom: 10px;
    }
    .otp-code {
      font-family: ${DS.fontHeadline};
      font-size: 44px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 12px;
    }
    .otp-expire {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      margin-top: 8px;
    }
    .divider {
      border: none;
      border-top: 1px solid rgba(118,118,131,0.12);
      margin: 24px 0;
    }
    .footer {
      background: ${DS.surfaceBand};
      padding: 24px 40px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: ${DS.outline};
      line-height: 1.8;
    }
    .text-center { text-align: center; }
    .mt-4 { margin-top: 16px; }
    .mb-4 { margin-bottom: 16px; }
    .text-muted { color: ${DS.outline}; font-size: 13px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: ${DS.radiusFull};
      font-size: 12px;
      font-weight: 700;
    }
    .badge-success { background: ${DS.successSurface}; color: ${DS.successOn}; }
    .badge-error { background: ${DS.errorSurface}; color: ${DS.error}; }
    .badge-warning { background: rgba(255,109,0,0.12); color: ${DS.ctaDark}; }
    .badge-primary { background: rgba(0,6,102,0.08); color: ${DS.navy}; }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(118,118,131,0.12);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 14px; color: ${DS.outline}; font-weight: 500; }
    .info-value { font-size: 14px; color: ${DS.onSurface}; font-weight: 700; }
    .product-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(118,118,131,0.08);
    }
    .product-row:last-child { border-bottom: none; }
    .product-img {
      width: 56px;
      height: 56px;
      border-radius: ${DS.radiusMd};
      background: ${DS.surfaceBand};
      object-fit: cover;
    }
    .product-info { flex: 1; }
    .product-name {
      font-family: ${DS.fontHeadline};
      font-size: 14px;
      font-weight: 700;
      color: ${DS.onSurface};
    }
    .product-meta { font-size: 13px; color: ${DS.outline}; }
    .product-price {
      font-family: ${DS.fontHeadline};
      font-size: 15px;
      font-weight: 800;
      color: ${DS.cta};
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Hagatna<span class="dot">.</span></h1>
      <p>Multi-Vendor E-commerce Platform</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Hagatna. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;


// ═══════════════════════════════════════════════════════════════════════════════
//  VENDOR EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Vendor: Verification (Link + Code) ───────────────────────────────────────
export const sendVendorVerificationEmail = async (
  to: string,
  name: string,
  otp: string,
  verifyUrl: string,
): Promise<void> => {
  const contentEn = `
    <h2>Verify Your Email</h2>
    <p style="margin-bottom:16px;">Hi <strong>${name}</strong>, thank you for registering as a vendor on Hagatna! Please verify your email to activate your account.</p>
    <div class="otp-block">
      <div class="otp-label">VERIFICATION CODE</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expire">Expires in 10 minutes</div>
    </div>
    <p class="text-center" style="margin-top:20px;">Or click the button below:</p>
    <div class="text-center mt-4 mb-4">
      <a href="${verifyUrl}" class="btn-cta">Verify My Email</a>
    </div>
    <p class="text-muted text-center">Never share this code with anyone.</p>
  `;

  const contentAr = `
    <h2>تحقق من بريدك الإلكتروني</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${name}</strong>، شكراً لتسجيلك كبائع على هاجاتنا! يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك.</p>
    <div class="otp-block">
      <div class="otp-label">رمز التحقق</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expire">تنتهي صلاحيته خلال 10 دقائق</div>
    </div>
    <p class="text-center" style="margin-top:20px;">أو اضغط على الزر أدناه:</p>
    <div class="text-center mt-4 mb-4">
      <a href="${verifyUrl}" class="btn-cta">تحقق من بريدي</a>
    </div>
    <p class="text-muted text-center">لا تشارك هذا الرمز مع أي شخص.</p>
  `;

  await send(to, 'Verify your Hagatna vendor account / تحقق من حسابك كبائع', baseTemplate(contentEn, contentAr));
};

// ─── Vendor: Welcome (after verification) ─────────────────────────────────────
export const sendVendorWelcomeEmail = async (
  to: string,
  name: string,
  storeName: string,
): Promise<void> => {
  const contentEn = `
    <h2>Welcome to Hagatna!</h2>
    <p style="margin-bottom:16px;">Hi <strong>${name}</strong>, your email has been verified and your store <strong>"${storeName}"</strong> is now under review.</p>
    <div class="card">
      <p style="font-size:14px;color:${DS.onSurfaceVar};">
        <strong>What's next?</strong><br/>
        Our team will review your application. You'll receive an email once your store is approved. In the meantime, you can prepare your products and store settings.
      </p>
    </div>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/dashboard" class="btn-primary">Go to Dashboard</a>
    </div>
  `;

  const contentAr = `
    <h2>مرحباً بك في هاجاتنا!</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${name}</strong>، تم التحقق من بريدك الإلكتروني ومتجرك <strong>"${storeName}"</strong> الآن قيد المراجعة.</p>
    <div class="card">
      <p style="font-size:14px;color:${DS.onSurfaceVar};">
        <strong>الخطوة التالية:</strong><br/>
        سيقوم فريقنا بمراجعة طلبك. ستتلقى رسالة بريد إلكتروني بمجرد الموافقة على متجرك. في هذه الأثناء، يمكنك تحضير منتجاتك وإعدادات المتجر.
      </p>
    </div>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/dashboard" class="btn-primary">الذهاب للوحة التحكم</a>
    </div>
  `;

  await send(to, 'Welcome to Hagatna! / مرحباً بك في هاجاتنا!', baseTemplate(contentEn, contentAr));
};

// ─── Vendor: Welcome (after admin approval) ───────────────────────────────────
export const sendVendorApprovedEmail = async (
  to: string,
  name: string,
  storeName: string,
): Promise<void> => {
  const contentEn = `
    <h2>🎉 Your Store is Approved!</h2>
    <p style="margin-bottom:16px;">Hi <strong>${name}</strong>, great news! Your store <strong>"${storeName}"</strong> has been approved and is now live on Hagatna.</p>
    <div class="card">
      <p style="font-size:14px;color:${DS.onSurfaceVar};">
        You can now start adding products, managing orders, and growing your business. Welcome aboard!
      </p>
    </div>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/dashboard" class="btn-cta">Start Selling</a>
    </div>
  `;

  const contentAr = `
    <h2>🎉 تمت الموافقة على متجرك!</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${name}</strong>، أخبار رائعة! تمت الموافقة على متجرك <strong>"${storeName}"</strong> وهو الآن مباشر على هاجاتنا.</p>
    <div class="card">
      <p style="font-size:14px;color:${DS.onSurfaceVar};">
        يمكنك الآن البدء في إضافة المنتجات وإدارة الطلبات وتنمية أعمالك. مرحباً بك!
      </p>
    </div>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/dashboard" class="btn-cta">ابدأ البيع</a>
    </div>
  `;

  await send(to, 'Your store is approved! / تمت الموافقة على متجرك!', baseTemplate(contentEn, contentAr));
};

// ─── Vendor: Rejection ────────────────────────────────────────────────────────
export const sendVendorRejectedEmail = async (
  to: string,
  name: string,
  storeName: string,
  reason: string,
): Promise<void> => {
  const eName = esc(name);
  const eStoreName = esc(storeName);
  const eReason = esc(reason);

  const contentEn = `
    <h2>Store Application Update</h2>
    <p style="margin-bottom:16px;">Hi <strong>${eName}</strong>, we've reviewed your store application for <strong>"${eStoreName}"</strong> and unfortunately it was not approved at this time.</p>
    <div class="card" style="border-left:3px solid ${DS.error};">
      <p style="font-size:14px;color:${DS.onSurfaceVar};">
        <strong>Reason:</strong><br/>
        ${eReason}
      </p>
    </div>
    <p style="margin-top:16px;">You can update your application and reapply. If you have questions, please contact our support team.</p>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/onboarding" class="btn-primary">Reapply</a>
    </div>
  `;

  const contentAr = `
    <h2>تحديث طلب التسجيل كبائع</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${eName}</strong>، قمنا بمراجعة طلب تسجيل متجرك <strong>"${eStoreName}"</strong> وللأسف لم يتم القبول في هذا الوقت.</p>
    <div class="card" style="border-left:3px solid ${DS.error};">
      <p style="font-size:14px;color:${DS.onSurfaceVar};">
        <strong>السبب:</strong><br/>
        ${eReason}
      </p>
    </div>
    <p style="margin-top:16px;">يمكنك تحديث طلبك وإعادة التسجيل. إذا كان لديك أي أسئلة، يرجى التواصل مع فريق الدعم.</p>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/onboarding" class="btn-primary">إعادة التسجيل</a>
    </div>
  `;

  await send(to, 'Your vendor application was not approved / لم يتم الموافقة على طلبك', baseTemplate(contentEn, contentAr));
};

// ─── Vendor: New Order ────────────────────────────────────────────────────────
interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl?: string;
}

export const sendVendorNewOrderEmail = async (
  to: string,
  vendorName: string,
  orderNumber: string,
  orderId: string,
  items: OrderItem[],
  total: number,
  customerName: string,
  customerAddress: string,
  createdAt: string,
): Promise<void> => {
  const itemsHtml = items.map(item => `
    <div class="product-row">
      ${item.imageUrl ? `<img src="${item.imageUrl}" class="product-img" alt="${item.name}" />` : ''}
      <div class="product-info">
        <div class="product-name">${item.name}</div>
        <div class="product-meta">Qty: ${item.quantity} × ${item.unitPrice.toFixed(2)} EGP</div>
      </div>
      <div class="product-price">${item.subtotal.toFixed(2)} EGP</div>
    </div>
  `).join('');

  const contentEn = `
    <h2>New Order Received!</h2>
    <p style="margin-bottom:16px;">Hi <strong>${vendorName}</strong>, you have a new order!</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">Order</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      <span class="badge badge-primary">${createdAt}</span>
    </div>

    <div class="card">
      ${itemsHtml}
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="info-row">
        <span class="info-label">Customer</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Delivery Address</span>
        <span class="info-value">${customerAddress}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total</span>
        <span class="info-value" style="color:${DS.cta};font-size:16px;">${total.toFixed(2)} EGP</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/orders/${orderId}" class="btn-cta">View Order Details</a>
    </div>
  `;

  const contentAr = `
    <h2>طلب جديد!</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${vendorName}</strong>، وصلك طلب جديد!</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">الطلب</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      <span class="badge badge-primary">${createdAt}</span>
    </div>

    <div class="card">
      ${itemsHtml}
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="info-row">
        <span class="info-label">العميل</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">عنوان التوصيل</span>
        <span class="info-value">${customerAddress}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الإجمالي</span>
        <span class="info-value" style="color:${DS.cta};font-size:16px;">${total.toFixed(2)} ج.م</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/orders/${orderId}" class="btn-cta">عرض تفاصيل الطلب</a>
    </div>
  `;

  await send(to, `New order #${orderNumber} / طلب جديد #${orderNumber}`, baseTemplate(contentEn, contentAr));
};

// ─── Vendor: Return Request ───────────────────────────────────────────────────
export const sendVendorReturnRequestEmail = async (
  to: string,
  vendorName: string,
  orderNumber: string,
  orderId: string,
  productName: string,
  returnReason: string,
  customerName: string,
): Promise<void> => {
  const contentEn = `
    <h2>Return Request</h2>
    <p style="margin-bottom:16px;">Hi <strong>${vendorName}</strong>, a customer has requested a return for order <strong>#${orderNumber}</strong>.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Product</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Customer</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Reason</span>
        <span class="info-value">${returnReason}</span>
      </div>
    </div>

    <p style="margin-top:16px;">Please review the request and take action.</p>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/returns?order=${orderId}" class="btn-cta">Review Return Request</a>
    </div>
  `;

  const contentAr = `
    <h2>طلب استرجاع</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${vendorName}</strong>، طلب عميل استرجاع للطلب <strong>#${orderNumber}</strong>.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">المنتج</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">العميل</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">السبب</span>
        <span class="info-value">${returnReason}</span>
      </div>
    </div>

    <p style="margin-top:16px;">يرجى مراجعة الطلب واتخاذ الإجراء المناسب.</p>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/returns?order=${orderId}" class="btn-cta">مراجعة طلب الاسترجاع</a>
    </div>
  `;

  await send(to, `Return request for order #${orderNumber} / طلب استرجاع للطلب #${orderNumber}`, baseTemplate(contentEn, contentAr));
};

// ─── Vendor: Payout (request + execution) ─────────────────────────────────────
export const sendVendorPayoutEmail = async (
  to: string,
  vendorName: string,
  amount: number,
  payoutId: string,
  status: 'requested' | 'completed',
): Promise<void> => {
  const isRequested = status === 'requested';
  const statusBadge = isRequested
    ? '<span class="badge badge-warning">Pending</span>'
    : '<span class="badge badge-success">Completed</span>';

  const statusBadgeAr = isRequested
    ? '<span class="badge badge-warning">قيد الانتظار</span>'
    : '<span class="badge badge-success">تم التنفيذ</span>';

  const contentEn = `
    <h2>${isRequested ? 'Payout Requested' : 'Payout Completed'}</h2>
    <p style="margin-bottom:16px;">Hi <strong>${vendorName}</strong>, your payout request has been ${isRequested ? 'submitted' : 'processed'}.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Amount</span>
        <span class="info-value" style="color:${DS.cta};font-size:18px;">${amount.toFixed(2)} EGP</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        ${statusBadge}
      </div>
      <div class="info-row">
        <span class="info-label">Reference</span>
        <span class="info-value">#${payoutId.slice(-8).toUpperCase()}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/earnings" class="btn-primary">View Earnings</a>
    </div>
  `;

  const contentAr = `
    <h2>${isRequested ? 'تم طلب السحب' : 'تم تنفيذ السحب'}</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${vendorName}</strong>، تم ${isRequested ? 'تقديم طلب' : 'تنفيذ'} السحب الخاص بك.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">المبلغ</span>
        <span class="info-value" style="color:${DS.cta};font-size:18px;">${amount.toFixed(2)} ج.م</span>
      </div>
      <div class="info-row">
        <span class="info-label">الحالة</span>
        ${statusBadgeAr}
      </div>
      <div class="info-row">
        <span class="info-label">المرجع</span>
        <span class="info-value">#${payoutId.slice(-8).toUpperCase()}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/vendor/earnings" class="btn-primary">عرض الأرباح</a>
    </div>
  `;

  const subject = isRequested
    ? 'Payout requested / تم طلب السحب'
    : 'Payout completed / تم تنفيذ السحب';

  await send(to, subject, baseTemplate(contentEn, contentAr));
};


// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Admin: Vendor Approval Request ───────────────────────────────────────────
export const sendAdminVendorApprovalEmail = async (
  to: string,
  adminName: string,
  vendorName: string,
  storeName: string,
  vendorId: string,
): Promise<void> => {
  const contentEn = `
    <div class="section-label">ADMIN NOTIFICATION</div>
    <h2>New Vendor Registration</h2>
    <p style="margin-bottom:16px;">Hi <strong>${adminName}</strong>, a new vendor has registered and is awaiting your approval.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Vendor Name</span>
        <span class="info-value">${vendorName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Store Name</span>
        <span class="info-value">${storeName}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/vendors/${vendorId}" class="btn-cta">Review Application</a>
    </div>
  `;

  const contentAr = `
    <div class="section-label">إشعار الإدارة</div>
    <h2>تسجيل بائع جديد</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${adminName}</strong>، قام بائع جديد بالتسجيل وهو في انتظار موافقتك.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">اسم البائع</span>
        <span class="info-value">${vendorName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">اسم المتجر</span>
        <span class="info-value">${storeName}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/vendors/${vendorId}" class="btn-cta">مراجعة الطلب</a>
    </div>
  `;

  await send(to, `New vendor registration: ${storeName} / تسجيل بائع جديد: ${storeName}`, baseTemplate(contentEn, contentAr));
};

// ─── Admin: Product Approval Request ──────────────────────────────────────────
export const sendAdminProductApprovalEmail = async (
  to: string,
  adminName: string,
  vendorName: string,
  productName: string,
  productId: string,
): Promise<void> => {
  const contentEn = `
    <div class="section-label">ADMIN NOTIFICATION</div>
    <h2>New Product Pending Approval</h2>
    <p style="margin-bottom:16px;">Hi <strong>${adminName}</strong>, vendor <strong>${vendorName}</strong> has added a new product that requires your approval.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Product</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Vendor</span>
        <span class="info-value">${vendorName}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/products/${productId}" class="btn-cta">Review Product</a>
    </div>
  `;

  const contentAr = `
    <div class="section-label">إشعار الإدارة</div>
    <h2>منتج جديد في انتظار الموافقة</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${adminName}</strong>، أضاف البائع <strong>${vendorName}</strong> منتجاً جديداً يحتاج موافقتك.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">المنتج</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">البائع</span>
        <span class="info-value">${vendorName}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/products/${productId}" class="btn-cta">مراجعة المنتج</a>
    </div>
  `;

  await send(to, `New product pending approval: ${productName} / منتج جديد يحتاج موافقة: ${productName}`, baseTemplate(contentEn, contentAr));
};

// ─── Admin: Return Status Change ──────────────────────────────────────────────
export const sendAdminReturnStatusEmail = async (
  to: string,
  adminName: string,
  orderNumber: string,
  productName: string,
  newStatus: string,
  orderId: string,
): Promise<void> => {
  const statusBadgeMap: Record<string, string> = {
    approved:  '<span class="badge badge-success">Approved</span>',
    rejected:  '<span class="badge badge-error">Rejected</span>',
    completed: '<span class="badge badge-success">Completed</span>',
    pending:   '<span class="badge badge-warning">Pending</span>',
  };

  const statusBadgeMapAr: Record<string, string> = {
    approved:  '<span class="badge badge-success">تمت الموافقة</span>',
    rejected:  '<span class="badge badge-error">مرفوض</span>',
    completed: '<span class="badge badge-success">مكتمل</span>',
    pending:   '<span class="badge badge-warning">قيد الانتظار</span>',
  };

  const contentEn = `
    <div class="section-label">ADMIN NOTIFICATION</div>
    <h2>Return Status Updated</h2>
    <p style="margin-bottom:16px;">Hi <strong>${adminName}</strong>, the return status for order <strong>#${orderNumber}</strong> has been updated.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Product</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">New Status</span>
        ${statusBadgeMap[newStatus] || `<span class="badge badge-primary">${newStatus}</span>`}
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/returns?order=${orderId}" class="btn-primary">View Details</a>
    </div>
  `;

  const contentAr = `
    <div class="section-label">إشعار الإدارة</div>
    <h2>تحديث حالة الاسترجاع</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${adminName}</strong>، تم تحديث حالة الاسترجاع للطلب <strong>#${orderNumber}</strong>.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">المنتج</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الحالة الجديدة</span>
        ${statusBadgeMapAr[newStatus] || `<span class="badge badge-primary">${newStatus}</span>`}
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/returns?order=${orderId}" class="btn-primary">عرض التفاصيل</a>
    </div>
  `;

  await send(to, `Return status updated for order #${orderNumber} / تحديث حالة الاسترجاع للطلب #${orderNumber}`, baseTemplate(contentEn, contentAr));
};

// ─── Admin: Product Status Change ─────────────────────────────────────────────
export const sendAdminProductStatusEmail = async (
  to: string,
  adminName: string,
  productName: string,
  vendorName: string,
  newStatus: string,
  productId: string,
): Promise<void> => {
  const statusBadgeMap: Record<string, string> = {
    active:             '<span class="badge badge-success">Active</span>',
    inactive:           '<span class="badge badge-error">Inactive</span>',
    pending_approval:   '<span class="badge badge-warning">Pending</span>',
    rejected:           '<span class="badge badge-error">Rejected</span>',
  };

  const statusBadgeMapAr: Record<string, string> = {
    active:             '<span class="badge badge-success">نشط</span>',
    inactive:           '<span class="badge badge-error">غير نشط</span>',
    pending_approval:   '<span class="badge badge-warning">قيد المراجعة</span>',
    rejected:           '<span class="badge badge-error">مرفوض</span>',
  };

  const contentEn = `
    <div class="section-label">ADMIN NOTIFICATION</div>
    <h2>Product Status Updated</h2>
    <p style="margin-bottom:16px;">Hi <strong>${adminName}</strong>, the status of product <strong>"${productName}"</strong> has been updated.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Product</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Vendor</span>
        <span class="info-value">${vendorName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">New Status</span>
        ${statusBadgeMap[newStatus] || `<span class="badge badge-primary">${newStatus}</span>`}
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/products/${productId}" class="btn-primary">View Product</a>
    </div>
  `;

  const contentAr = `
    <div class="section-label">إشعار الإدارة</div>
    <h2>تحديث حالة المنتج</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${adminName}</strong>، تم تحديث حالة المنتج <strong>"${productName}"</strong>.</p>

    <div class="card">
      <div class="info-row">
        <span class="info-label">المنتج</span>
        <span class="info-value">${productName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">البائع</span>
        <span class="info-value">${vendorName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الحالة الجديدة</span>
        ${statusBadgeMapAr[newStatus] || `<span class="badge badge-primary">${newStatus}</span>`}
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/products/${productId}" class="btn-primary">عرض المنتج</a>
    </div>
  `;

  await send(to, `Product status updated: ${productName} / تحديث حالة المنتج: ${productName}`, baseTemplate(contentEn, contentAr));
};


// ═══════════════════════════════════════════════════════════════════════════════
//  CUSTOMER EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Customer: Verification Code ──────────────────────────────────────────────
export const sendCustomerVerificationEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  const contentEn = `
    <h2>Verify Your Email</h2>
    <p style="margin-bottom:16px;">Hi <strong>${name}</strong>, welcome to Hagatna! Use the code below to verify your email and activate your account.</p>

    <div class="otp-block">
      <div class="otp-label">VERIFICATION CODE</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expire">Expires in 10 minutes</div>
    </div>

    <p class="text-muted text-center">Never share this code with anyone. Hagatna will never ask for your OTP.</p>
  `;

  const contentAr = `
    <h2>تحقق من بريدك الإلكتروني</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${name}</strong>، أهلاً بك في هاجاتنا! استخدم الرمز أدناه للتحقق من بريدك وتفعيل حسابك.</p>

    <div class="otp-block">
      <div class="otp-label">رمز التحقق</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expire">تنتهي صلاحيته خلال 10 دقائق</div>
    </div>

    <p class="text-muted text-center">لا تشارك هذا الرمز مع أي شخص. لن تطلب هاجاتنا رمز التحقق أبداً.</p>
  `;

  await send(to, 'Verify your Hagatna account / تحقق من حسابك في هاجاتنا', baseTemplate(contentEn, contentAr));
};

// ─── Customer: Order Placed ───────────────────────────────────────────────────
export const sendCustomerOrderPlacedEmail = async (
  to: string,
  customerName: string,
  orderNumber: string,
  orderId: string,
  items: OrderItem[],
  subtotal: number,
  shippingCost: number,
  total: number,
  estimatedDelivery: string,
): Promise<void> => {
  const itemsHtml = items.map(item => `
    <div class="product-row">
      ${item.imageUrl ? `<img src="${item.imageUrl}" class="product-img" alt="${item.name}" />` : ''}
      <div class="product-info">
        <div class="product-name">${item.name}</div>
        <div class="product-meta">Qty: ${item.quantity} × ${item.unitPrice.toFixed(2)} EGP</div>
      </div>
      <div class="product-price">${item.subtotal.toFixed(2)} EGP</div>
    </div>
  `).join('');

  const contentEn = `
    <h2>Order Received! 🎉</h2>
    <p style="margin-bottom:16px;">Hi <strong>${customerName}</strong>, we've received your order and it's now awaiting confirmation.</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">Order Number</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      <span class="badge badge-success">Placed</span>
    </div>

    <div class="card">
      ${itemsHtml}
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="info-row">
        <span class="info-label">Subtotal</span>
        <span class="info-value">${subtotal.toFixed(2)} EGP</span>
      </div>
      <div class="info-row">
        <span class="info-label">Shipping</span>
        <span class="info-value">${shippingCost === 0 ? 'Free' : shippingCost.toFixed(2) + ' EGP'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total</span>
        <span class="info-value" style="color:${DS.cta};font-size:16px;">${total.toFixed(2)} EGP</span>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="info-row">
        <span class="info-label">Estimated Delivery</span>
        <span class="info-value">${estimatedDelivery}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn-cta">Track Your Order</a>
    </div>
  `;

  const contentAr = `
    <h2>تم استلام طلبك! 🎉</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${customerName}</strong>، استلمنا طلبك بنجاح وهو الآن في انتظار التأكيد.</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">رقم الطلب</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      <span class="badge badge-success">تم الاستلام</span>
    </div>

    <div class="card">
      ${itemsHtml}
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="info-row">
        <span class="info-label">المجموع الفرعي</span>
        <span class="info-value">${subtotal.toFixed(2)} ج.م</span>
      </div>
      <div class="info-row">
        <span class="info-label">الشحن</span>
        <span class="info-value">${shippingCost === 0 ? 'مجاني' : shippingCost.toFixed(2) + ' ج.م'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الإجمالي</span>
        <span class="info-value" style="color:${DS.cta};font-size:16px;">${total.toFixed(2)} ج.م</span>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <div class="info-row">
        <span class="info-label">التسليم المتوقع</span>
        <span class="info-value">${estimatedDelivery}</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn-cta">تتبع طلبك</a>
    </div>
  `;

  await send(to, `Order received #${orderNumber} / تم استلام طلبك #${orderNumber}`, baseTemplate(contentEn, contentAr));
};

// ─── Customer: Order Status Change ────────────────────────────────────────────
export const sendCustomerOrderStatusEmail = async (
  to: string,
  customerName: string,
  orderNumber: string,
  orderId: string,
  newStatus: string,
): Promise<void> => {
  const statusConfig: Record<string, { en: string; ar: string; badge: string; badgeAr: string; message: string; messageAr: string }> = {
    confirmed: {
      en: 'Confirmed',
      ar: 'تم التأكيد',
      badge: '<span class="badge badge-success">Confirmed</span>',
      badgeAr: '<span class="badge badge-success">مؤكد</span>',
      message: 'Your order has been confirmed and is being prepared.',
      messageAr: 'تم تأكيد طلبك وهو جاري التجهيز.',
    },
    processing: {
      en: 'Processing',
      ar: 'قيد المعالجة',
      badge: '<span class="badge badge-warning">Processing</span>',
      badgeAr: '<span class="badge badge-warning">قيد المعالجة</span>',
      message: 'Your order is being processed and will be shipped soon.',
      messageAr: 'طلبك قيد المعالجة وسيتم شحنه قريباً.',
    },
    shipped: {
      en: 'Shipped',
      ar: 'تم الشحن',
      badge: '<span class="badge badge-primary">Shipped</span>',
      badgeAr: '<span class="badge badge-primary">تم الشحن</span>',
      message: 'Great news! Your order has been shipped and is on its way.',
      messageAr: 'أخبار رائعة! تم شحن طلبك وهو في الطريق إليك.',
    },
    delivered: {
      en: 'Delivered',
      ar: 'تم التوصيل',
      badge: '<span class="badge badge-success">Delivered</span>',
      badgeAr: '<span class="badge badge-success">تم التوصيل</span>',
      message: 'Your order has been delivered. We hope you enjoy your purchase!',
      messageAr: 'تم توصيل طلبك. نأمل أن تستمتع بمشترياتك!',
    },
  };

  const config = statusConfig[newStatus] || {
    en: newStatus,
    ar: newStatus,
    badge: `<span class="badge badge-primary">${newStatus}</span>`,
    badgeAr: `<span class="badge badge-primary">${newStatus}</span>`,
    message: `Your order status has been updated to: ${newStatus}`,
    messageAr: `تم تحديث حالة طلبك إلى: ${newStatus}`,
  };

  const contentEn = `
    <h2>Order Status Update</h2>
    <p style="margin-bottom:16px;">Hi <strong>${customerName}</strong>, ${config.message}</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">Order</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      ${config.badge}
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn-cta">Track Your Order</a>
    </div>
  `;

  const contentAr = `
    <h2>تحديث حالة الطلب</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${customerName}</strong>، ${config.messageAr}</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">الطلب</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      ${config.badgeAr}
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn-cta">تتبع طلبك</a>
    </div>
  `;

  await send(to, `Order #${orderNumber} status: ${config.en} / حالة الطلب #${orderNumber}: ${config.ar}`, baseTemplate(contentEn, contentAr));
};

// ─── Customer: Refund Status ──────────────────────────────────────────────────
export const sendCustomerRefundEmail = async (
  to: string,
  customerName: string,
  orderNumber: string,
  refundAmount: number,
  status: 'requested' | 'approved' | 'rejected' | 'completed',
  orderId: string,
): Promise<void> => {
  const statusConfig: Record<string, { en: string; ar: string; badge: string; badgeAr: string; message: string; messageAr: string }> = {
    requested: {
      en: 'Refund Requested',
      ar: 'طلب استرجاع',
      badge: '<span class="badge badge-warning">Requested</span>',
      badgeAr: '<span class="badge badge-warning">قيد الانتظار</span>',
      message: 'Your refund request has been submitted and is being reviewed.',
      messageAr: 'تم تقديم طلب الاسترجاع الخاص بك وهو قيد المراجعة.',
    },
    approved: {
      en: 'Refund Approved',
      ar: 'تمت الموافقة على الاسترجاع',
      badge: '<span class="badge badge-success">Approved</span>',
      badgeAr: '<span class="badge badge-success">تمت الموافقة</span>',
      message: `Your refund of ${refundAmount.toFixed(2)} EGP has been approved and will be processed shortly.`,
      messageAr: `تمت الموافقة على استرجاع ${refundAmount.toFixed(2)} ج.م وسيتم تنفيذه قريباً.`,
    },
    rejected: {
      en: 'Refund Rejected',
      ar: 'تم رفض الاسترجاع',
      badge: '<span class="badge badge-error">Rejected</span>',
      badgeAr: '<span class="badge badge-error">مرفوض</span>',
      message: 'Your refund request has been reviewed and unfortunately was not approved.',
      messageAr: 'تمت مراجعة طلب الاسترجاع وللأسف لم يتم الموافقة عليه.',
    },
    completed: {
      en: 'Refund Completed',
      ar: 'تم الاسترجاع',
      badge: '<span class="badge badge-success">Completed</span>',
      badgeAr: '<span class="badge badge-success">مكتمل</span>',
      message: `Your refund of ${refundAmount.toFixed(2)} EGP has been processed successfully.`,
      messageAr: `تم تنفيذ استرجاع ${refundAmount.toFixed(2)} ج.م بنجاح.`,
    },
  };

  const config = statusConfig[status];

  const contentEn = `
    <h2>Refund Update</h2>
    <p style="margin-bottom:16px;">Hi <strong>${customerName}</strong>, ${config.message}</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">Order</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      ${config.badge}
    </div>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Refund Amount</span>
        <span class="info-value" style="color:${DS.cta};font-size:16px;">${refundAmount.toFixed(2)} EGP</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn-primary">View Order</a>
    </div>
  `;

  const contentAr = `
    <h2>تحديث الاسترجاع</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${customerName}</strong>، ${config.messageAr}</p>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div>
        <span class="text-muted">الطلب</span><br/>
        <span style="font-family:${DS.fontHeadline};font-size:16px;font-weight:800;color:${DS.onSurface};">#${orderNumber}</span>
      </div>
      ${config.badgeAr}
    </div>

    <div class="card">
      <div class="info-row">
        <span class="info-label">مبلغ الاسترجاع</span>
        <span class="info-value" style="color:${DS.cta};font-size:16px;">${refundAmount.toFixed(2)} ج.م</span>
      </div>
    </div>

    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/orders/${orderId}" class="btn-primary">عرض الطلب</a>
    </div>
  `;

  await send(to, `Refund update for order #${orderNumber} / تحديث الاسترجاع للطلب #${orderNumber}`, baseTemplate(contentEn, contentAr));
};


// ═══════════════════════════════════════════════════════════════════════════════
//  EXISTING EMAILS (updated to match new design system)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── OTP Email (Customer) ────────────────────────────────────────────────────
export const sendOtpEmail = async (to: string, name: string, otp: string): Promise<void> => {
  const eName = esc(name);
  const contentEn = `
    <h2>Verify Your Email Address</h2>
    <p style="margin-bottom:16px;">Hi <strong>${eName}</strong>, welcome to Hagatna! Use the code below to verify your email address and activate your account.</p>
    <div class="otp-block">
      <div class="otp-label">VERIFICATION CODE</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expire">Expires in 10 minutes</div>
    </div>
    <p class="text-muted text-center">Never share this code with anyone. Hagatna will never ask for your OTP.</p>
  `;

  const contentAr = `
    <h2>تحقق من عنوان بريدك الإلكتروني</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${eName}</strong>، أهلاً بك في هاجاتنا! استخدم الرمز أدناه للتحقق من بريدك الإلكتروني وتفعيل حسابك.</p>
    <div class="otp-block">
      <div class="otp-label">رمز التحقق</div>
      <div class="otp-code">${otp}</div>
      <div class="otp-expire">تنتهي صلاحيته خلال 10 دقائق</div>
    </div>
    <p class="text-muted text-center">لا تشارك هذا الرمز مع أي شخص. لن تطلب هاجاتنا رمز OTP الخاص بك أبداً.</p>
  `;

  await send(to, 'Verify your Hagatna account / تحقق من حسابك في هاجاتنا', baseTemplate(contentEn, contentAr));
};

// ─── Password Reset Email ─────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (to: string, name: string, resetUrl: string): Promise<void> => {
  const eName = esc(name);
  const contentEn = `
    <h2>Reset Your Password</h2>
    <p style="margin-bottom:16px;">Hi <strong>${eName}</strong>, we received a request to reset the password for your Hagatna account. Click the button below to set a new password.</p>
    <div class="text-center mt-4 mb-4">
      <a href="${resetUrl}" class="btn-cta">Reset My Password</a>
    </div>
    <p class="text-muted text-center">Or copy this link: <a href="${resetUrl}" style="color:${DS.navy};">${resetUrl}</a></p>
    <p class="text-muted text-center mt-4">This link expires in 30 minutes.</p>
  `;

  const contentAr = `
    <h2>إعادة تعيين كلمة المرور</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${eName}</strong>، تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في هاجاتنا. انقر على الزر أدناه لتعيين كلمة مرور جديدة.</p>
    <div class="text-center mt-4 mb-4">
      <a href="${resetUrl}" class="btn-cta">إعادة تعيين كلمة المرور</a>
    </div>
    <p class="text-muted text-center">أو انسخ هذا الرابط: <a href="${resetUrl}" style="color:${DS.navy};">${resetUrl}</a></p>
    <p class="text-muted text-center mt-4">ينتهي هذا الرابط خلال 30 دقيقة.</p>
  `;

  await send(to, 'Reset your Hagatna password / إعادة تعيين كلمة مرورك', baseTemplate(contentEn, contentAr));
};

// ─── Welcome Email ────────────────────────────────────────────────────────────
export const sendWelcomeEmail = async (to: string, name: string): Promise<void> => {
  const eName = esc(name);
  const contentEn = `
    <h2>Welcome to Hagatna!</h2>
    <p style="margin-bottom:16px;">Hi <strong>${eName}</strong>, your account has been successfully verified. Start exploring thousands of products from our trusted vendors.</p>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/shop" class="btn-cta">Start Shopping</a>
    </div>
  `;

  const contentAr = `
    <h2>مرحباً بك في هاجاتنا!</h2>
    <p style="margin-bottom:16px;">مرحباً <strong>${eName}</strong>، تم التحقق من حسابك بنجاح. ابدأ استكشاف آلاف المنتجات من بائعينا الموثوقين.</p>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/shop" class="btn-cta">ابدأ التسوق</a>
    </div>
  `;

  await send(to, 'Welcome to Hagatna! / مرحباً بك في هاجاتنا!', baseTemplate(contentEn, contentAr));
};



// ═══════════════════════════════════════════════════════════════════════════════
//  CONTACT EMAIL (to Admin)
// ═══════════════════════════════════════════════════════════════════════════════

export const sendContactEmailToAdmin = async (
  adminEmail: string,
  senderName: string,
  senderEmail: string,
  subject: string,
  message: string,
  messageId: string,
): Promise<void> => {
  const eName = esc(senderName);
  const eEmail = esc(senderEmail);
  const eSubject = esc(subject);
  const eMessage = esc(message);

  const contentEn = `
    <div class="section-label">NEW CONTACT MESSAGE</div>
    <h2>Contact Form Submission</h2>
    <p style="margin-bottom:16px;">You have received a new message from the contact form.</p>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(118,118,131,0.12);">
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#767683;font-weight:500;">From</span>
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#1A1C1C;font-weight:700;">${eName}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(118,118,131,0.12);">
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#767683;font-weight:500;">Email</span>
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#1A1C1C;font-weight:700;">${eEmail}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#767683;font-weight:500;">Subject</span>
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#1A1C1C;font-weight:700;">${eSubject}</span>
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <p style="font-family:'Tajawal',sans-serif;font-size:14px;color:#454652;line-height:1.7;white-space:pre-wrap;">${eMessage}</p>
    </div>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/contact/${messageId}" class="btn-cta">View in Dashboard</a>
    </div>
  `;

  const contentAr = `
    <div class="section-label">رسالة تواصل جديدة</div>
    <h2>رسالة من نموذج التواصل</h2>
    <p style="margin-bottom:16px;">لقد تلقيت رسالة جديدة من نموذج التواصل.</p>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(118,118,131,0.12);">
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#767683;font-weight:500;">من</span>
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#1A1C1C;font-weight:700;">${eName}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(118,118,131,0.12);">
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#767683;font-weight:500;">البريد الإلكتروني</span>
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#1A1C1C;font-weight:700;">${eEmail}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#767683;font-weight:500;">الموضوع</span>
        <span style="font-family:'Tajawal',sans-serif;font-size:14px;color:#1A1C1C;font-weight:700;">${eSubject}</span>
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <p style="font-family:'Tajawal',sans-serif;font-size:14px;color:#454652;line-height:1.7;white-space:pre-wrap;">${eMessage}</p>
    </div>
    <div class="text-center mt-4">
      <a href="${env.FRONTEND_URL}/admin/contact/${messageId}" class="btn-cta">عرض في لوحة التحكم</a>
    </div>
  `;

  await send(adminEmail, `New Contact: ${eSubject} / رسالة تواصل جديدة: ${eSubject}`, baseTemplate(contentEn, contentAr));
};

// ═══════════════════════════════════════════════════════════════════════════════
//  INTERNAL SEND
// ═══════════════════════════════════════════════════════════════════════════════

const send = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    // Non-blocking — log but don't crash the request
    logger.error(`Failed to send email to ${to}:`, error);
  }
};
