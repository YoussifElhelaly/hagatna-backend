import { Locale } from '@shared/types';

type BilingualMessage = Record<Locale, string>;

const msg = (en: string, ar: string): BilingualMessage => ({ en, ar });

export const Messages = {
  auth: {
    registerSuccess:     msg('Registration successful. Please verify your email.', 'تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني.'),
    loginSuccess:        msg('Login successful', 'تم تسجيل الدخول بنجاح'),
    logoutSuccess:       msg('Logged out successfully', 'تم تسجيل الخروج بنجاح'),
    emailVerified:       msg('Email verified successfully', 'تم التحقق من البريد الإلكتروني بنجاح'),
    otpSent:             msg('OTP sent to your email', 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'),
    otpInvalid:          msg('Invalid or expired OTP', 'رمز التحقق غير صالح أو منتهي الصلاحية'),
    passwordResetSent:   msg('Password reset link sent if email exists', 'تم إرسال رابط إعادة تعيين كلمة المرور إذا كان البريد موجوداً'),
    passwordReset:       msg('Password reset successful. Please login.', 'تم إعادة تعيين كلمة المرور بنجاح. يرجى تسجيل الدخول.'),
    invalidCredentials:  msg('Invalid email or password', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'),
    emailExists:         msg('Email already registered', 'البريد الإلكتروني مسجل بالفعل'),
    accountSuspended:    msg('Account is suspended', 'الحساب موقوف'),
    notVerified:         msg('Please verify your email first', 'يرجى التحقق من بريدك الإلكتروني أولاً'),
    useSocialLogin:      msg('This account uses social login', 'هذا الحساب يستخدم تسجيل الدخول الاجتماعي'),
    tokenRefreshed:      msg('Token refreshed', 'تم تجديد الرمز'),
    tokenInvalid:        msg('Invalid or expired token', 'الرمز غير صالح أو منتهي الصلاحية'),
  },
  user: {
    profileUpdated:      msg('Profile updated successfully', 'تم تحديث الملف الشخصي بنجاح'),
    passwordChanged:     msg('Password changed successfully', 'تم تغيير كلمة المرور بنجاح'),
    addressAdded:        msg('Address added successfully', 'تم إضافة العنوان بنجاح'),
    addressUpdated:      msg('Address updated successfully', 'تم تحديث العنوان بنجاح'),
    addressDeleted:      msg('Address deleted successfully', 'تم حذف العنوان بنجاح'),
    notFound:            msg('User not found', 'المستخدم غير موجود'),
  },
  vendor: {
    onboardSuccess:      msg('Vendor application submitted. Awaiting admin approval.', 'تم تقديم طلب البائع. في انتظار موافقة المشرف.'),
    approved:            msg('Vendor approved successfully', 'تمت الموافقة على البائع بنجاح'),
    rejected:            msg('Vendor application rejected', 'تم رفض طلب البائع'),
    suspended:           msg('Vendor suspended', 'تم إيقاف البائع'),
    profileUpdated:      msg('Store profile updated', 'تم تحديث ملف المتجر'),
    notFound:            msg('Vendor not found', 'البائع غير موجود'),
    alreadyApplied:      msg('You already have a vendor application', 'لديك بالفعل طلب بائع'),
  },
  product: {
    created:             msg('Product created successfully', 'تم إنشاء المنتج بنجاح'),
    updated:             msg('Product updated successfully', 'تم تحديث المنتج بنجاح'),
    deleted:             msg('Product deleted successfully', 'تم حذف المنتج بنجاح'),
    notFound:            msg('Product not found', 'المنتج غير موجود'),
    outOfStock:          msg('Product is out of stock', 'المنتج غير متوفر في المخزون'),
    lowStock:            msg('Product stock is low', 'مخزون المنتج منخفض'),
    wishlistAdded:       msg('Added to wishlist', 'تمت الإضافة إلى قائمة الرغبات'),
    wishlistRemoved:     msg('Removed from wishlist', 'تمت الإزالة من قائمة الرغبات'),
  },
  cart: {
    itemAdded:           msg('Item added to cart', 'تمت إضافة العنصر إلى السلة'),
    itemUpdated:         msg('Cart item updated', 'تم تحديث عنصر السلة'),
    itemRemoved:         msg('Item removed from cart', 'تمت إزالة العنصر من السلة'),
    cleared:             msg('Cart cleared', 'تم مسح السلة'),
    couponValid:         msg('Coupon applied successfully', 'تم تطبيق الكوبون بنجاح'),
    couponInvalid:       msg('Invalid or expired coupon', 'الكوبون غير صالح أو منتهي الصلاحية'),
  },
  order: {
    created:             msg('Order placed successfully', 'تم تقديم الطلب بنجاح'),
    cancelled:           msg('Order cancelled', 'تم إلغاء الطلب'),
    statusUpdated:       msg('Order status updated', 'تم تحديث حالة الطلب'),
    notFound:            msg('Order not found', 'الطلب غير موجود'),
  },
  review: {
    submitted:           msg('Review submitted and pending moderation', 'تم تقديم التقييم وهو في انتظار المراجعة'),
    approved:            msg('Review approved', 'تمت الموافقة على التقييم'),
    rejected:            msg('Review rejected', 'تم رفض التقييم'),
    deleted:             msg('Review deleted', 'تم حذف التقييم'),
    notFound:            msg('Review not found', 'التقييم غير موجود'),
    alreadyReviewed:     msg('You have already reviewed this product', 'لقد قمت بتقييم هذا المنتج بالفعل'),
  },
  general: {
    unauthorized:        msg('Unauthorized access', 'وصول غير مصرح به'),
    forbidden:           msg('You do not have permission to perform this action', 'ليس لديك إذن لأداء هذا الإجراء'),
    notFound:            msg('Resource not found', 'المورد غير موجود'),
    serverError:         msg('Internal server error', 'خطأ داخلي في الخادم'),
    validationError:     msg('Validation failed', 'فشل التحقق من الصحة'),
    tooManyRequests:     msg('Too many requests, please try again later', 'طلبات كثيرة جداً، يرجى المحاولة لاحقاً'),
  },
};

/** Picks the message in the correct locale, falls back to English */
export const t = (message: BilingualMessage, locale: Locale = 'en'): string => {
  return message[locale] ?? message['en'];
};
