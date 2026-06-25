import * as Sentry from '@sentry/node';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import passport from 'passport';
import cookieParser from 'cookie-parser';

import { corsOptions } from '@config/cors';
import { env } from '@config/env';
import { prisma } from '@database/prisma/client';
import { redis } from '@database/redis/client';
import { globalRateLimiter } from '@shared/middlewares/rateLimiter';
import { csrfMiddleware } from '@shared/middlewares/csrf';
import { localeMiddleware } from '@shared/middlewares/locale';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { ApiError } from '@shared/utils/ApiError';
import { logger } from '@shared/utils/logger';

// ─── Route Imports ──────────────────────────────────────────────────────────
import authRoutes from '@modules/auth/auth.routes';
import userRoutes from '@modules/users/users.routes';
import vendorRoutes from '@modules/vendors/vendors.routes';
import categoryRoutes from '@modules/categories/categories.routes';
import productRoutes from '@modules/products/products.routes';
import cartRoutes from '@modules/cart/cart.routes';
import orderRoutes from '@modules/orders/orders.routes';
import paymentRoutes from '@modules/payments/payments.routes';
import shippingRoutes from '@modules/shipping/shipping.routes';
import reviewRoutes from '@modules/reviews/reviews.routes';
import promotionRoutes from '@modules/promotions/promotions.routes';
import notificationRoutes from '@modules/notifications/notifications.routes';
// import chatRoutes from '@modules/chat/chat.routes'; // CHAT_DISABLED
import analyticsRoutes from '@modules/analytics/analytics.routes';
import adminRoutes from '@modules/payouts/payouts.routes';
import uploadRoutes from '@modules/upload/upload.routes';
import wishlistRoutes from '@modules/wishlist/wishlist.routes';
import returnsRoutes from '@modules/returns/returns.routes';
import attributeRoutes from '@modules/attributes/attributes.routes';
import vendorPlanRoutes from '@modules/vendor-plans/vendor-plans.routes';
import loyaltyRoutes from '@modules/loyalty/loyalty.routes';
import mediaRoutes from '@modules/media/media.routes';
import settingsRoutes from '@modules/settings/settings.routes';
import activityLogsRoutes from '@modules/activity-logs/activity-logs.routes';
import contactRoutes from '@modules/contact/contact.routes';
import legalRoutes from '@modules/legal/legal.routes';
import bannerRoutes from '@modules/banners/banners.routes';
import testEmailRoutes from '@modules/test-email/test-email.routes';

// ─── Passport Config ─────────────────────────────────────────────────────────
import '@config/passport';

const app: Application = express();

// ─── Trust Proxy ─────────────────────────────────────────────────────────────
// Required by express-rate-limit v7 and for correct IP detection behind
// a reverse proxy (nginx, load balancer). '1' means trust the first proxy hop.
app.set('trust proxy', 1);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],
        imgSrc:         ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc:     ["'self'"],
        fontSrc:        ["'self'"],
        objectSrc:      ["'none'"],
        frameSrc:       ["'none'"],
        upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // needed for Cloudinary images
  })
);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

// ─── Performance Middleware ───────────────────────────────────────────────────
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────────────────────
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ─── Global Rate Limiter (before body parsing to block before reading request body) ───
app.use(globalRateLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ─── Passport (OAuth) ─────────────────────────────────────────────────────────
app.use(passport.initialize());

// ─── i18n / Locale ────────────────────────────────────────────────────────────
app.use(localeMiddleware);

// ─── CSRF Protection ──────────────────────────────────────────────────────────
app.use(csrfMiddleware);

// ─── Health Check (deep — checks DB + Redis) ──────────────────────────────────
app.get('/health', async (_req, res) => {
  let dbOk = false;
  let redisOk = false;

  try { await prisma.$queryRaw`SELECT 1`; dbOk = true; } catch { /* silent */ }
  try { redisOk = (await redis.ping()) === 'PONG'; } catch { /* silent */ }

  const allOk = dbOk && redisOk;
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API_PREFIX = env.API_PREFIX;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/vendors`, vendorRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/shipping`, shippingRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/promotions`, promotionRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
// app.use(`${API_PREFIX}/conversations`, chatRoutes); // CHAT_DISABLED
app.use(`${API_PREFIX}/admin/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
app.use(`${API_PREFIX}/returns`, returnsRoutes);
app.use(`${API_PREFIX}/attributes`, attributeRoutes);
app.use(`${API_PREFIX}/vendor-plans`, vendorPlanRoutes);
app.use(`${API_PREFIX}/loyalty`, loyaltyRoutes);
app.use(`${API_PREFIX}/media`, mediaRoutes);
app.use(`${API_PREFIX}/admin/settings`, settingsRoutes);
app.use(`${API_PREFIX}/admin/activity-logs`, activityLogsRoutes);
app.use(`${API_PREFIX}/contact`, contactRoutes);
app.use(`${API_PREFIX}/legal`, legalRoutes);
app.use(`${API_PREFIX}/banners`, bannerRoutes);
app.use(`${API_PREFIX}/test-email`, testEmailRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, _res, next) => {
  next(new ApiError(404, 'Route not found'));
});

// ─── Sentry Error Handler (must be before our errorHandler) ───────────────────
// Captures every unhandled error with full request context, then calls next(err)
Sentry.setupExpressErrorHandler(app);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
