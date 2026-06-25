import { JwtPayload, Locale } from '@shared/types';

declare global {
  namespace Express {
    // Extends Passport's User so req.user carries our JWT fields
    interface User extends JwtPayload {}
    interface Request {
      locale: Locale;
    }
  }
}

export {};
