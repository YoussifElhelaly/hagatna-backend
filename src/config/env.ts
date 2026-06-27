import { cleanEnv, str, port, num, url } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  // Server
  NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
  PORT: port({ default: 5000 }),
  API_PREFIX: str({ default: '/api/v1' }),

  // Database
  DATABASE_URL: url(),
  // Prisma connection pool — appended to DATABASE_URL at runtime
  DB_POOL_SIZE:    num({ default: 10 }),  // max connections in pool
  DB_POOL_TIMEOUT: num({ default: 30 }),  // seconds to wait for a free connection

  // Redis
  REDIS_HOST: str({ default: '127.0.0.1' }),
  REDIS_PORT: num({ default: 6379 }),
  REDIS_PASSWORD: str({ default: '' }),

  // JWT
  JWT_ACCESS_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_ACCESS_EXPIRES_IN: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),

  // Frontend
  FRONTEND_URL: str({ default: 'http://localhost:3000' }),

  // Google OAuth
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_CALLBACK_URL: str(),

  // Facebook OAuth
  FACEBOOK_APP_ID: str(),
  FACEBOOK_APP_SECRET: str(),
  FACEBOOK_CALLBACK_URL: str(),

  // Email
  SMTP_HOST: str({ default: 'smtp.gmail.com' }),
  SMTP_PORT: num({ default: 587 }),
  SMTP_USER: str(),
  SMTP_PASS: str(),
  EMAIL_FROM: str({ default: 'Hagatna <noreply@hagatnaa.com>' }),

  // Uploads
  UPLOAD_DIR: str({ default: 'uploads' }),
  BACKEND_URL: str({ default: 'http://localhost:5000' }),

  // Paymob — optional, feature is disabled when any value is missing
  PAYMOB_API_KEY:               str({ default: '' }),
  PAYMOB_INTEGRATION_ID_CARD:   str({ default: '' }),
  PAYMOB_INTEGRATION_ID_WALLET: str({ default: '' }),
  PAYMOB_HMAC_SECRET:           str({ default: '' }),
  PAYMOB_IFRAME_ID:             str({ default: '' }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: num({ default: 300000 }),   // 5 minutes
  RATE_LIMIT_MAX: num({ default: 300 }),             // 300 req / 5 min
  AUTH_RATE_LIMIT_MAX: num({ default: 50 }),         // 50 auth attempts / 15 min

  // Locale
  DEFAULT_LOCALE: str({ default: 'en' }),

  // Sentry — optional, error tracking disabled when not set
  SENTRY_DSN: str({ default: '' }),
});
