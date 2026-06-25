import { CorsOptions } from 'cors';
import { env } from '@config/env';

// Support comma-separated list of allowed origins; strip trailing slashes
const allowedOrigins = env.FRONTEND_URL
  .split(',')
  .map((u) => u.trim().replace(/\/$/, ''))
  .filter(Boolean);

// In development always allow localhost:3000 so a misconfigured .env never
// blocks the dev server.
if (env.NODE_ENV === 'development' && (!allowedOrigins.includes('http://localhost:3000') || !allowedOrigins.includes('http://localhost:3001'))) {
  allowedOrigins.push('http://localhost:3000');
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With', 'x-csrf-token'],
};
