# Hagatna — QA Testing Guide

> **Base URL:** `https://your-domain.com/api/v1`  
> كل الـ endpoints المحمية تحتاج `Authorization: Bearer <token>`

---

## أولاً: Authentication

### ✅ TC-AUTH-01 — تسجيل مستخدم جديد
**الخطوات:**
1. `POST /auth/register` بيانات صحيحة
**النتيجة المتوقعة:** 201 + `{ accessToken, refreshToken, user }`

### ✅ TC-AUTH-02 — تسجيل بإيميل موجود
**الخطوات:**
1. `POST /auth/register` بنفس إيميل مستخدم موجود
**النتيجة المتوقعة:** 409 Conflict

### ✅ TC-AUTH-03 — تسجيل دخول صحيح
**الخطوات:**
1. `POST /auth/login` بإيميل وباسورد صحيحين
**النتيجة المتوقعة:** 200 + tokens

### ✅ TC-AUTH-04 — تسجيل دخول بباسورد خاطئ
**النتيجة المتوقعة:** 401 Unauthorized

### ✅ TC-AUTH-05 — تجديد الـ token
**الخطوات:**
1. `POST /auth/refresh` بـ refreshToken صحيح
**النتيجة المتوقعة:** 200 + tokens جديدة

### ✅ TC-AUTH-06 — استخدام refreshToken بعد logout
**الخطوات:**
1. `POST /auth/logout`
2. `POST /auth/refresh` بنفس الـ refreshToken
**النتيجة المتوقعة:** 401 (الـ token اتلغى)

---

## ثانياً: Vendor Onboarding

### ✅ TC-VENDOR-01 — تقديم طلب انضمام ناجح
**الخطوات:**
1. سجّل دخول كـ customer
2. `GET /vendor-plans` → اختر plan ID
3. `POST /vendors/onboard` بكل البيانات المطلوبة
**النتيجة المتوقعة:** 201 + vendor profile بـ status=`pending`

### ✅ TC-VENDOR-02 — تقديم طلب بدون رقم ضريبي
**النتيجة المتوقعة:** 400 validation error

### ✅ TC-VENDOR-03 — الأدمن يوافق على طلب
**الخطوات:**
1. سجّل دخول كـ admin
2. `PATCH /vendors/:id/approve`
**النتيجة المتوقعة:** 200 + status=`approved` + دور المستخدم يصبح `vendor`

### ✅ TC-VENDOR-04 — الأدمن يرفض طلب مع سبب
**الخطوات:**
1. `PATCH /vendors/:id/reject` `{ "rejectionReason": "البيانات غير مكتملة" }`
**النتيجة المتوقعة:** 200 + status=`rejected` + rejectionReason محفوظ

### ✅ TC-VENDOR-05 — محاولة بائع إنشاء منتج وهو في حالة pending
**النتيجة المتوقعة:** 403 Forbidden (الدور لسه customer)

### ✅ TC-VENDOR-06 — الأدمن يغير نسبة العمولة
**الخطوات:**
1. `PATCH /vendors/:id/commission` `{ "commissionRate": 15 }`
**النتيجة المتوقعة:** 200 + commissionRate = 15

---

## ثالثاً: Product Management

### ✅ TC-PROD-01 — بائع ينشئ منتج
**الخطوات:**
1. `POST /products` بـ status=`pending_approval`
**النتيجة المتوقعة:** 201 + product بـ status=`pending_approval`

### ✅ TC-PROD-02 — منتج بدون اسم
**النتيجة المتوقعة:** 400 validation error

### ✅ TC-PROD-03 — بائع يحاول تعديل منتج بائع آخر
**النتيجة المتوقعة:** 403 Forbidden

### ✅ TC-PROD-04 — الأدمن يوافق على منتج (يغير status لـ active)
**الخطوات:**
1. `PATCH /products/admin/:id` `{ "status": "active" }`
**النتيجة المتوقعة:** 200 + المنتج يظهر في البحث العام

### ✅ TC-PROD-05 — Bulk Update — بائع يغير سعر عدة منتجات
**الخطوات:**
1. `PATCH /products/bulk` `{ "ids": ["id1", "id2"], "update": { "price": 50 } }`
**النتيجة المتوقعة:** 200 + كل المنتجات المذكورة اتغير سعرها

### ✅ TC-PROD-06 — Bulk Update — بائع يحاول تعديل منتجات ليست ملكه
**النتيجة المتوقعة:** 403 Forbidden

### ✅ TC-PROD-07 — بحث عن منتج بعد حذفه (soft delete)
**الخطوات:**
1. `DELETE /products/:id`
2. `GET /products?search=...`
**النتيجة المتوقعة:** المنتج لا يظهر في النتائج

---

## رابعاً: Cart

### ✅ TC-CART-01 — إضافة منتج للسلة
**الخطوات:**
1. `POST /cart/items` `{ "productId": "uuid", "quantity": 2 }`
**النتيجة المتوقعة:** 200 + item في السلة

### ✅ TC-CART-02 — إضافة منتج بكمية أكثر من المخزون
**النتيجة المتوقعة:** 400 — Insufficient stock

### ✅ TC-CART-03 — تعديل كمية منتج في السلة
**الخطوات:**
1. `PATCH /cart/items/:id` `{ "quantity": 5 }`
**النتيجة المتوقعة:** 200 + الكمية اتحدثت

### ✅ TC-CART-04 — إضافة منتج غير متاح (status != active)
**النتيجة المتوقعة:** 400 bad request

---

## خامساً: Orders — الحالة العادية (Single Vendor)

### ✅ TC-ORD-01 — إتمام طلب بعنوان inline
**الخطوات:**
1. أضف منتجات لسلة التسوق (من بائع واحد)
2. `POST /orders` بعنوان inline وطريقة دفع
**النتيجة المتوقعة:** 201 + array فيها طلب واحد

### ✅ TC-ORD-02 — إتمام طلب بعنوان محفوظ
**الخطوات:**
1. `POST /users/me/addresses` لإنشاء عنوان
2. `POST /orders` بـ addressId
**النتيجة المتوقعة:** 201 + طلب بعنوان صحيح

### ✅ TC-ORD-03 — إتمام طلب بدون عنوان
**النتيجة المتوقعة:** 400 — يجب تحديد عنوان

### ✅ TC-ORD-04 — إتمام طلب والسلة فاضية
**النتيجة المتوقعة:** 400 — Your cart is empty

### ✅ TC-ORD-05 — إلغاء طلب pending
**الخطوات:**
1. `DELETE /orders/:orderNumber`
**النتيجة المتوقعة:** 200 + status=`cancelled` + المخزون رجع

### ✅ TC-ORD-06 — إلغاء طلب بعد شحنه
**النتيجة المتوقعة:** 409 Conflict — لا يمكن الإلغاء

---

## سادساً: Orders — Split by Vendor (أهم سيناريو)

### ✅ TC-ORD-SPLIT-01 — سلة فيها بائعين مختلفين
**الخطوات:**
1. أضف منتج X من **بائع A** للسلة
2. أضف منتج Y من **بائع B** للسلة
3. `POST /orders`
**النتيجة المتوقعة:**
- 201 + **array فيها طلبان** بأرقام مختلفة
- كل طلب فيه فقط منتجات بائعه
- مجموع الـ totals = إجمالي السلة

### ✅ TC-ORD-SPLIT-02 — التأكد من المخزون في حالة التقسيم
**الخطوات:**
1. نفس الخطوات السابقة
2. تحقق من مخزون المنتج X ومخزون المنتج Y
**النتيجة المتوقعة:** كلاهما انخفض بالكميات الصحيحة

### ✅ TC-ORD-SPLIT-03 — كوبون خصم مع بائعين
**الخطوات:**
1. أضف منتجات من بائعين مختلفين
2. `POST /orders` مع `couponCode`
**النتيجة المتوقعة:**
- الخصم يتوزع على الطلبين بنسبة كل طلب من الإجمالي
- مجموع الخصومات = قيمة الكوبون الكلية
- الكوبون يُستخدم مرة واحدة فقط

### ✅ TC-ORD-SPLIT-04 — نقاط ولاء مع بائعين
**الخطوات:**
1. أضف منتجات من بائعين مختلفين
2. `POST /orders` مع `pointsToRedeem: 100`
**النتيجة المتوقعة:**
- النقاط تُخصم من الرصيد مرة واحدة
- توزع على الطلبين بالنسبة
- كل طلب يكسب نقاط على قيمته الصافية

---

## سابعاً: Coupon / Promotions

### ✅ TC-COUPON-01 — استخدام كوبون صحيح
**النتيجة المتوقعة:** الخصم يُطبق على الطلب

### ✅ TC-COUPON-02 — كوبون منتهي الصلاحية
**النتيجة المتوقعة:** 400 — This coupon has expired

### ✅ TC-COUPON-03 — كوبون استُخدم عدد مرات يتجاوز الحد
**النتيجة المتوقعة:** 400 — Coupon usage limit reached

### ✅ TC-COUPON-04 — نفس المستخدم يستخدم الكوبون مرتين
**النتيجة المتوقعة:** 400 — You have already used this coupon

### ✅ TC-COUPON-05 — كوبون بحد أدنى للشراء — الطلب أقل من الحد
**النتيجة المتوقعة:** 400 — Minimum purchase required

---

## ثامناً: Loyalty Program

### ✅ TC-LOYAL-01 — كسب نقاط بعد طلب
**الخطوات:**
1. أتمم طلب بقيمة 200 جنيه (مع تفعيل البرنامج وnسبة 5%)
**النتيجة المتوقعة:** الطلب يظهر `pointsEarned: 10` + رصيد النقاط زاد بـ 10

### ✅ TC-LOYAL-02 — معاينة النقاط قبل الطلب
**الخطوات:**
1. `GET /loyalty/preview?subtotal=200`
**النتيجة المتوقعة:** `{ pointsToEarn: 10 }`

### ✅ TC-LOYAL-03 — استرداد نقاط على الطلب
**الخطوات:**
1. تأكد من وجود نقاط كافية في الرصيد
2. `POST /orders` مع `pointsToRedeem: 100`
**النتيجة المتوقعة:** الخصم يُطبق + النقاط تُخصم من الرصيد

### ✅ TC-LOYAL-04 — استرداد نقاط أكثر من الرصيد
**النتيجة المتوقعة:** 400 — Insufficient loyalty points

### ✅ TC-LOYAL-05 — استرداد نقاط تتجاوز الحد الأقصى (50% من الطلب)
**النتيجة المتوقعة:** 400 — Points discount cannot exceed 50%

### ✅ TC-LOYAL-06 — الأدمن يعدّل نقاط مستخدم يدوياً
**الخطوات:**
1. `POST /loyalty/admin/users/:userId/adjust` `{ "points": 500, "description": "مكافأة" }`
**النتيجة المتوقعة:** 200 + الرصيد زاد بـ 500

### ✅ TC-LOYAL-07 — الأدمن يوقف برنامج النقاط
**الخطوات:**
1. `PATCH /loyalty/settings` `{ "isEnabled": false }`
2. أتمم طلباً
**النتيجة المتوقعة:** لا نقاط تُكتسب ولا تُستخدم

---

## تاسعاً: Payouts & Commissions

### ✅ TC-PAY-01 — بائع يشوف ملخص أرباحه
**الخطوات:**
1. سجّل دخول كـ vendor
2. `GET /vendors/me/earnings`
**النتيجة المتوقعة:** 200 + `{ totalGross, totalCommission, totalNet, totalPaid, totalPending }`

### ✅ TC-PAY-02 — بائع يشوف سجل المدفوعات
**الخطوات:**
1. `GET /vendors/me/payouts?status=pending`
**النتيجة المتوقعة:** قائمة بـ commission records للبائع

### ✅ TC-PAY-03 — الأدمن يوافق على payout بدون صورة
**الخطوات:**
1. `PATCH /admin/payouts/:id/approve` (بدون file)
**النتيجة المتوقعة:** 200 + status=`completed` + `paymentProof: null`

### ✅ TC-PAY-04 — الأدمن يوافق على payout مع صورة إيصال
**الخطوات:**
1. `PATCH /admin/payouts/:id/approve` (multipart/form-data + field "image")
**النتيجة المتوقعة:** 200 + `paymentProof` = Cloudinary URL

### ✅ TC-PAY-05 — الأدمن يوافق على payout تم صرفه مسبقاً
**النتيجة المتوقعة:** 409 — This payout has already been approved

### ✅ TC-PAY-06 — التحقق من حساب العمولة
**الخطوات:**
1. منتج سعره 100 جنيه + عمولة البائع 10%
2. أتمم طلباً
**النتيجة المتوقعة:** VendorCommission: `grossAmount=100`, `commissionAmount=10`, `netAmount=90`

---

## عاشراً: Returns & Refunds

### ✅ TC-RET-01 — عميل يطلب استرجاع لطلب مسلّم
**الخطوات:**
1. `POST /orders/:orderNumber/return` `{ "reason": "المنتج معطوب", "amount": 50 }`
**النتيجة المتوقعة:** 201 + refund record بـ status=`pending`

### ✅ TC-RET-02 — طلب استرجاع لطلب غير مسلّم
**النتيجة المتوقعة:** 409 — Returns only allowed for delivered orders

### ✅ TC-RET-03 — الأدمن يوافق على الاسترجاع
**الخطوات:**
1. `PATCH /orders/admin/returns/:id/approve`
**النتيجة المتوقعة:** 200 + حالة الطلب تصبح `refunded`

### ✅ TC-RET-04 — الأدمن يسجل تنفيذ الاسترداد
**الخطوات:**
1. `PATCH /orders/admin/returns/:id/refund`
**النتيجة المتوقعة:** 200 + `status=completed` + `processedAt` يُضبط

---

## حادي عشر: Analytics (Admin)

### ✅ TC-ANALYTICS-01 — Overview KPIs
**الخطوات:**
1. `GET /admin/analytics/overview`
**النتيجة المتوقعة:** يرجع `totalRevenue`, `totalPlatformIncome`, `totalOrders`, `pendingOrders`, `totalUsers`, `totalVendors`, `totalProducts`, `totalReviews`

### ✅ TC-ANALYTICS-02 — التحقق من totalPlatformIncome
**الخطوات:**
1. أتمم عدة طلبات
2. `GET /admin/analytics/overview`
**النتيجة المتوقعة:** `totalPlatformIncome` = مجموع كل `commissionAmount` للطلبات المدفوعة

### ✅ TC-ANALYTICS-03 — Active Carts
**الخطوات:**
1. `GET /admin/analytics/active-carts`
**النتيجة المتوقعة:** قائمة بالمستخدمين الذين عندهم منتجات في السلة ولم يشتروا

### ✅ TC-ANALYTICS-04 — Revenue Chart
**الخطوات:**
1. `GET /admin/analytics/revenue?from=2026-01-01&to=2026-06-30`
**النتيجة المتوقعة:** بيانات يومية بالإيراد وعدد الطلبات

---

## ثاني عشر: Vendor Order Items Flow

### ✅ TC-VORD-01 — بائع يشوف الطلبات الواردة له
**الخطوات:**
1. عميل يشتري من البائع
2. `GET /orders/vendor/items`
**النتيجة المتوقعة:** الطلب يظهر بـ status=`pending`

### ✅ TC-VORD-02 — بائع يحدّث حالة البند
**الخطوات:**
1. `PATCH /orders/vendor/items/:itemId/status` `{ "status": "confirmed" }`
**النتيجة المتوقعة:** 200 + status=`confirmed`

### ✅ TC-VORD-03 — بائع يحاول تعيين status = delivered (غير مسموح)
**النتيجة المتوقعة:** 400 — Vendors can only set: confirmed, processing, or shipped

### ✅ TC-VORD-04 — بائع يحاول تحديث بند لا يخصه
**النتيجة المتوقعة:** 403 Forbidden

---

## ثالث عشر: Permissions & Security

### ✅ TC-SEC-01 — وصول بدون token
**النتيجة المتوقعة:** 401 Unauthorized

### ✅ TC-SEC-02 — customer يحاول الوصول لـ admin endpoint
**النتيجة المتوقعة:** 403 Forbidden

### ✅ TC-SEC-03 — vendor يحاول الوصول لـ admin endpoint
**النتيجة المتوقعة:** 403 Forbidden

### ✅ TC-SEC-04 — بائع موقوف (suspended) يحاول تسجيل الدخول
**النتيجة المتوقعة:** 401 — Account is suspended

### ✅ TC-SEC-05 — العميل يحاول الاطلاع على طلب شخص آخر
**الخطوات:**
1. `GET /orders/:orderNumber` بـ orderNumber لا يخصه
**النتيجة المتوقعة:** 403 Forbidden

---

## رابع عشر: Edge Cases مهمة

### ✅ TC-EDGE-01 — طلب وأحد المنتجات نفد من المخزون
**الخطوات:**
1. مخزون منتج = 1
2. مستخدمان يضيفانه للسلة ويشتران في نفس الوقت
**النتيجة المتوقعة:** أحدهما ينجح والآخر يحصل على 400 — Insufficient stock

### ✅ TC-EDGE-02 — سلة فيها 3 بائعين مختلفين
**النتيجة المتوقعة:** 3 طلبات منفصلة تُنشأ في نفس الوقت

### ✅ TC-EDGE-03 — إلغاء طلب يُعيد المخزون
**الخطوات:**
1. اشتر منتجاً — مخزونه يقل
2. ألغِ الطلب
**النتيجة المتوقعة:** المخزون يرجع لقيمته الأصلية

### ✅ TC-EDGE-04 — كوبون percentage مع maxDiscountAmount
**مثال:** كوبون 20% بحد أقصى 50 جنيه — طلب بـ 500 جنيه
**النتيجة المتوقعة:** الخصم = 50 جنيه (وليس 100 جنيه)

### ✅ TC-EDGE-05 — رفع صورة بصيغة غير مدعومة (PDF في حقل صورة)
**النتيجة المتوقعة:** 400 — Invalid file type
