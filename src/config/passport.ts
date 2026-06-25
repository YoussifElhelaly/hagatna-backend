import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from 'passport-facebook';
import { env } from '@config/env';
import { prisma } from '@database/prisma/client';
import { Provider } from '@prisma/client';

// ─── Google Strategy ──────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    },
    async (_accessToken, _refreshToken, profile: GoogleProfile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned from Google'));

        let user = await prisma.user.findFirst({
          where: { OR: [{ email }, { googleId: profile.id }] },
        });

        if (user) {
          // Link google ID if not already linked
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id, avatar: profile.photos?.[0]?.value ?? user.avatar },
            });
          }
        } else {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value,
              provider: Provider.google,
              isVerified: true,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

// ─── Facebook Strategy ────────────────────────────────────────────────────────
passport.use(
  new FacebookStrategy(
    {
      clientID: env.FACEBOOK_APP_ID,
      clientSecret: env.FACEBOOK_APP_SECRET,
      callbackURL: env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    },
    async (_accessToken, _refreshToken, profile: FacebookProfile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email returned from Facebook. Please ensure your Facebook account has a verified email.'));

        let user = await prisma.user.findFirst({
          where: { OR: [{ email }, { facebookId: profile.id }] },
        });

        if (user) {
          if (!user.facebookId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { facebookId: profile.id, avatar: profile.photos?.[0]?.value ?? user.avatar },
            });
          }
        } else {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email,
              facebookId: profile.id,
              avatar: profile.photos?.[0]?.value,
              provider: Provider.facebook,
              isVerified: true,
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);
