# Hagatna E-Commerce API Documentation | توثيق API لمنصة هاقتنا

> **Base URL:** `http://localhost:5000/api/v1`
> **Version:** 1.0.0
> **Auth:** Bearer JWT in `Authorization: Bearer <token>` header
> **Locale:** `Accept-Language: ar` or `Accept-Language: en` (default: `ar`)

---

## Table of Contents | فهرس المحتويات

1. [Global Info](#global-info)
2. [Auth Module](#auth-module)
3. [Users Module](#users-module)
4. [Vendors Module](#vendors-module)
5. [Categories Module](#categories-module)
6. [Products Module](#products-module)
7. [Cart Module](#cart-module)
8. [Orders Module](#orders-module)
9. [Shipping Module](#shipping-module)
10. [Reviews Module](#reviews-module)
11. [Promotions Module](#promotions-module)
12. [Notifications Module](#notifications-module)

---

## Global Info | معلومات عامة

### Response Envelope | هيكل الاستجابة

All responses follow this envelope:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### Error Format | هيكل الأخطاء

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### HTTP Status Codes | رموز الحالة

| Code | Meaning (EN) | المعنى (AR) |
|------|-------------|-------------|
| 200 | OK | ناجح |
| 201 | Created | تم الإنشاء |
| 400 | Bad Request | طلب غير صحيح |
| 401 | Unauthorized | غير مصادق |
| 403 | Forbidden | غير مصرح |
| 404 | Not Found | غير موجود |
| 409 | Conflict | تعارض |
| 429 | Too Many Requests | طلبات كثيرة |
| 500 | Internal Server Error | خطأ داخلي |

### Roles | الأدوار

| Role | Description (EN) | الوصف (AR) |
|------|-----------------|------------|
| `customer` | Registered buyer | مشتري مسجل |
| `vendor` | Approved store owner | صاحب متجر معتمد |
| `admin` | Platform administrator | مدير المنصة |

### Pagination Query Params | معاملات التصفح

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

---

## Auth Module | وحدة المصادقة

Base path: `/auth`

---

### POST /auth/register | تسجيل مستخدم جديد

**Auth Required:** No | **Rate Limited:** Yes (5 req/15min)

**Request Body:**
```json
{
  "name": "Ahmed Ali",
  "email": "ahmed@example.com",
  "password": "SecurePass@123",
  "phone": "+971501234567"
}
```

**Validation Rules:**
- `name`: 2–100 characters
- `email`: valid format, unique
- `password`: min 8 chars, must contain uppercase, lowercase, number, special char
- `phone`: optional, E.164 format

**Response 201:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "id": "uuid",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "role": "customer",
    "isVerified": false
  }
}
```

**Errors:** 409 if email already registered.

---

### POST /auth/login | تسجيل الدخول

**Auth Required:** No | **Rate Limited:** Yes (10 req/15min)

**Request Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "SecurePass@123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "name": "Ahmed Ali",
      "email": "ahmed@example.com",
      "role": "customer",
      "isVerified": true,
      "avatar": null
    }
  }
}
```

**Security Note:** Same error message for wrong email/wrong password (prevents user enumeration).

**Errors:** 401 if credentials invalid, 403 if account suspended.

---

### POST /auth/refresh | تجديد رمز الوصول

**Auth Required:** No

**Request Body:**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Notes:** Both tokens are rotated on each refresh. Old refresh token is invalidated.

---

### POST /auth/logout | تسجيل الخروج

**Auth Required:** Yes

**Request Body:** None

**Response 200:** `{ "message": "Logged out successfully" }`

---

### POST /auth/verify-email | التحقق من البريد الإلكتروني

**Auth Required:** No

**Request Body:**
```json
{ "email": "ahmed@example.com", "otp": "847291" }
```

**Notes:** OTP expires in 10 minutes. User account is activated upon success.

---

### POST /auth/resend-otp | إعادة إرسال رمز التحقق

**Auth Required:** No | **Rate Limited:** Yes (3 req/hour)

**Request Body:**
```json
{ "email": "ahmed@example.com" }
```

**Notes:** Always returns 200 even if email not found (prevents enumeration).

---

### POST /auth/forgot-password | نسيت كلمة المرور

**Auth Required:** No | **Rate Limited:** Yes

**Request Body:**
```json
{ "email": "ahmed@example.com" }
```

**Notes:** Always returns 200. Reset link sent via email if account exists.

---

### POST /auth/reset-password | إعادة تعيين كلمة المرور

**Auth Required:** No

**Request Body:**
```json
{
  "token": "hex-token-from-email",
  "password": "NewSecurePass@123"
}
```

**Notes:** Token expires in 30 minutes. All sessions invalidated after reset.

---

### GET /auth/google | OAuth Google

**Auth Required:** No

Redirects to Google OAuth consent screen.

---

### GET /auth/google/callback | Google OAuth Callback

Handles OAuth callback. Redirects with tokens on success.

---

### GET /auth/facebook | OAuth Facebook

Redirects to Facebook OAuth consent screen.

---

### GET /auth/facebook/callback | Facebook OAuth Callback

Handles OAuth callback. Redirects with tokens on success.

---

## Users Module | وحدة المستخدمين

Base path: `/users`

---

### GET /users/me | عرض الملف الشخصي

**Auth Required:** Yes (any role)

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Ahmed Ali",
    "email": "ahmed@example.com",
    "phone": "+971501234567",
    "avatar": "https://cdn.example.com/avatar.jpg",
    "role": "customer",
    "isVerified": true,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PATCH /users/me | تحديث الملف الشخصي

**Auth Required:** Yes

**Request Body (all optional):**
```json
{
  "name": "Ahmed Mohamed",
  "phone": "+971509876543",
  "avatar": "https://cdn.example.com/new-avatar.jpg"
}
```

---

### PATCH /users/me/password | تغيير كلمة المرور

**Auth Required:** Yes

**Request Body:**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

**Errors:** 400 if account uses OAuth only (no password set). 401 if current password wrong.

---

### DELETE /users/me | حذف الحساب

**Auth Required:** Yes

**Request Body:**
```json
{ "password": "CurrentPass@123" }
```

**Notes:** Soft-delete (sets `isActive: false`). OAuth users do not need to provide password.

---

### GET /users/me/addresses | عرض العناوين

**Auth Required:** Yes

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "label": "Home",
      "recipientName": "Ahmed Ali",
      "phone": "+971501234567",
      "street": "123 Main St",
      "city": "Dubai",
      "country": "AE",
      "zipCode": "00000",
      "isDefault": true
    }
  ]
}
```

---

### POST /users/me/addresses | إضافة عنوان

**Auth Required:** Yes

**Request Body:**
```json
{
  "label": "Work",
  "recipientName": "Ahmed Ali",
  "phone": "+971501234567",
  "street": "456 Business Bay",
  "city": "Dubai",
  "country": "AE",
  "zipCode": "00001",
  "isDefault": false
}
```

**Notes:** First address created is automatically set as default.

---

### PATCH /users/me/addresses/:id | تحديث عنوان

**Auth Required:** Yes

---

### DELETE /users/me/addresses/:id | حذف عنوان

**Auth Required:** Yes

**Notes:** If deleted address was default, next address is auto-promoted.

---

### PATCH /users/me/addresses/:id/default | تعيين عنوان افتراضي

**Auth Required:** Yes

---

### GET /users/me/wishlist | قائمة المفضلة

**Auth Required:** Yes

**Query Params:** `page`, `limit`

---

### POST /users/me/wishlist | إضافة إلى المفضلة

**Auth Required:** Yes

**Request Body:**
```json
{ "productId": "uuid" }
```

---

### DELETE /users/me/wishlist/:productId | حذف من المفضلة

**Auth Required:** Yes

---

### GET /users | قائمة المستخدمين

**Auth Required:** Admin only

**Query Params:** `page`, `limit`, `search`, `role`, `isActive`

---

### PATCH /users/:id/status | تغيير حالة المستخدم

**Auth Required:** Admin only

**Request Body:**
```json
{ "isActive": false }
```

---

## Vendors Module | وحدة البائعين

Base path: `/vendors`

---

### POST /vendors/onboard | طلب أن تصبح بائعاً

**Auth Required:** Yes (verified user)

**Request Body:**
```json
{
  "storeName": { "en": "TechZone", "ar": "تيك زون" },
  "description": { "en": "Electronics store", "ar": "متجر إلكترونيات" },
  "address": "123 Market St",
  "city": "Dubai",
  "country": "AE",
  "logo": "https://cdn.example.com/logo.jpg",
  "banner": "https://cdn.example.com/banner.jpg"
}
```

**Business Rules:**
- One application per user
- If previously rejected, can re-apply (updates existing record)
- Pending/approved → returns 409

**Response 201:** Vendor profile with `status: "pending"`

---

### GET /vendors/me | عرض ملف البائع

**Auth Required:** Vendor only

---

### PATCH /vendors/me | تحديث ملف المتجر

**Auth Required:** Vendor only

**Notes:** Only approved vendors can update. Slug regenerated if English name changes.

---

### GET /vendors/me/stats | إحصائيات المتجر

**Auth Required:** Vendor only

**Response 200:**
```json
{
  "data": {
    "totalProducts": 45,
    "activeProducts": 38,
    "totalOrders": 210,
    "pendingOrders": 12,
    "totalRevenue": 52400.00,
    "pendingCommission": 1240.50,
    "totalReviews": 89,
    "averageRating": 4.3
  }
}
```

---

### GET /vendors/:slug | ملف المتجر العام

**Auth Required:** No

Returns public store info with active product count and approved review count.

---

### GET /vendors | قائمة البائعين

**Auth Required:** Admin only

**Query Params:** `page`, `limit`, `status` (pending/approved/rejected/suspended), `search`

---

### PATCH /vendors/:id/approve | قبول بائع

**Auth Required:** Admin only

**Notes:** Atomically updates vendor status to `approved` AND upgrades user role to `vendor`.

---

### PATCH /vendors/:id/reject | رفض بائع

**Auth Required:** Admin only

**Request Body:**
```json
{ "rejectionReason": "Incomplete documentation provided." }
```

---

### PATCH /vendors/:id/suspend | تعليق بائع

**Auth Required:** Admin only

**Notes:** Atomically sets vendor status to `suspended`, sets user `isActive: false`, clears refresh token.

---

### PATCH /vendors/:id/commission | تحديث نسبة العمولة

**Auth Required:** Admin only

**Request Body:**
```json
{ "commissionRate": 12.5 }
```

**Validation:** 0–50%

---

## Categories Module | وحدة التصنيفات

Base path: `/categories`

---

### GET /categories | كل التصنيفات

**Auth Required:** No | **Cached:** Redis 1 hour

Returns full active tree (2 levels deep: parent → children → grandchildren), ordered by `sortOrder`.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": { "en": "Electronics", "ar": "إلكترونيات" },
      "slug": "electronics",
      "image": "https://cdn.example.com/electronics.jpg",
      "sortOrder": 1,
      "children": [
        {
          "id": "uuid",
          "name": { "en": "Phones", "ar": "هواتف" },
          "slug": "phones",
          "children": []
        }
      ]
    }
  ]
}
```

---

### GET /categories/:slug | تصنيف محدد

**Auth Required:** No

Returns category with parent breadcrumb, children, and active product count.

---

### POST /categories | إنشاء تصنيف

**Auth Required:** Admin only

**Request Body:**
```json
{
  "name": { "en": "Electronics", "ar": "إلكترونيات" },
  "description": { "en": "All electronics", "ar": "كل الإلكترونيات" },
  "parentId": "uuid-or-null",
  "image": "https://cdn.example.com/img.jpg",
  "sortOrder": 1
}
```

**Notes:** Slug auto-generated from English name. Cache invalidated.

---

### PATCH /categories/:id | تحديث تصنيف

**Auth Required:** Admin only

**Guards:** Cannot set self as parent. Cache invalidated on update.

---

### DELETE /categories/:id | حذف تصنيف

**Auth Required:** Admin only

**Guards:** Blocked if category has products OR sub-categories. Cache invalidated.

---

## Products Module | وحدة المنتجات

Base path: `/products`

---

### GET /products | قائمة المنتجات

**Auth Required:** No

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page (max 100) |
| `categoryId` | uuid | Filter by category |
| `vendorId` | uuid | Filter by vendor |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `search` | string | Search in name (EN+AR) and slug |
| `tag` | string | Filter by tag |
| `isFeatured` | boolean | Featured only |
| `sort` | string | `newest`, `popular`, `price_asc`, `price_desc` |

**Notes:** Only `status: active` products returned.

---

### GET /products/featured | المنتجات المميزة

**Auth Required:** No | **Cached:** Redis 10 min

Returns top 12 featured active products ordered by view count.

---

### GET /products/vendor/me | منتجات متجري

**Auth Required:** Vendor only

**Query Params:** `page`, `limit`, `status` (draft/active/archived), `search`

**Notes:** Shows all statuses including draft. Includes `costPrice` field.

---

### GET /products/:slug | تفاصيل منتج

**Auth Required:** No | **Cached:** Redis 15 min

Returns full product with variants, all images, tags, vendor info, category, review count. View count incremented non-blocking.

---

### POST /products | إنشاء منتج

**Auth Required:** Vendor only (approved)

**Request Body:**
```json
{
  "categoryId": "uuid",
  "name": { "en": "iPhone 15 Pro", "ar": "آيفون 15 برو" },
  "description": { "en": "Latest iPhone", "ar": "أحدث آيفون" },
  "price": 4999.00,
  "comparePrice": 5499.00,
  "costPrice": 4200.00,
  "sku": "APPL-IP15P-256",
  "stockQuantity": 50,
  "lowStockThreshold": 5,
  "variants": [
    {
      "name": "256GB - Black",
      "options": { "storage": "256GB", "color": "Black" },
      "price": 4999.00,
      "sku": "APPL-IP15P-256-BLK",
      "stockQuantity": 25
    }
  ],
  "images": [
    { "url": "https://cdn.example.com/img1.jpg", "isPrimary": true, "sortOrder": 0 }
  ],
  "tags": ["apple", "iphone", "smartphone"]
}
```

**Notes:** Product created with `status: draft`. Slug auto-generated. First image auto-set as primary.

---

### PATCH /products/:id | تحديث منتج

**Auth Required:** Vendor (own product)

**Notes:** `tags` field replaces all existing tags. Slug regenerated if EN name changes.

---

### PATCH /products/:id/status | تغيير حالة المنتج

**Auth Required:** Vendor (own product)

**Request Body:**
```json
{ "status": "active" }
```

**Values:** `draft`, `active`, `archived`

---

### DELETE /products/:id | أرشفة منتج

**Auth Required:** Vendor (own) or Admin

**Notes:** Soft-delete — sets `status: archived`. Does not delete DB record.

---

### PATCH /products/:id/feature | تمييز منتج

**Auth Required:** Admin only

Toggles `isFeatured` on/off. Featured cache invalidated.

---

### POST /products/:id/variants | إضافة نوع

**Auth Required:** Vendor (own product)

**Request Body:**
```json
{
  "name": "512GB - White",
  "options": { "storage": "512GB", "color": "White" },
  "price": 5499.00,
  "sku": "APPL-IP15P-512-WHT",
  "stockQuantity": 15
}
```

---

### PATCH /products/:id/variants/:variantId | تحديث نوع

**Auth Required:** Vendor (own product)

---

### DELETE /products/:id/variants/:variantId | حذف نوع

**Auth Required:** Vendor (own product)

---

### PUT /products/:id/images | تحديث صور المنتج

**Auth Required:** Vendor (own product)

**Notes:** Full replacement — all existing images deleted, new ones created.

**Request Body:**
```json
{
  "images": [
    { "url": "https://cdn.example.com/img1.jpg", "isPrimary": true, "sortOrder": 0, "altText": "Front view" },
    { "url": "https://cdn.example.com/img2.jpg", "isPrimary": false, "sortOrder": 1, "altText": "Back view" }
  ]
}
```

---

## Cart Module | وحدة السلة

Base path: `/cart`

**All routes require authentication.**

---

### GET /cart | عرض السلة

**Auth Required:** Yes

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "items": [
      {
        "id": "uuid",
        "quantity": 2,
        "priceSnapshot": 4999.00,
        "product": {
          "id": "uuid",
          "name": { "en": "iPhone 15 Pro", "ar": "آيفون 15 برو" },
          "slug": "iphone-15-pro",
          "images": [{ "url": "...", "altText": "..." }],
          "vendor": { "storeName": { "en": "TechZone", "ar": "تيك زون" } }
        },
        "variant": {
          "name": "256GB - Black",
          "options": { "storage": "256GB", "color": "Black" },
          "price": 4999.00
        }
      }
    ],
    "subtotal": 9998.00,
    "itemCount": 2
  }
}
```

**Notes:** Cart auto-created on first access. `priceSnapshot` locks price at add time.

---

### POST /cart/items | إضافة منتج للسلة

**Auth Required:** Yes

**Request Body:**
```json
{
  "productId": "uuid",
  "variantId": "uuid-or-omit",
  "quantity": 2
}
```

**Business Rules:**
- If item already in cart → increments quantity (no duplicate)
- Validates product is `active`, vendor is `approved`
- Validates stock: `existingQty + newQty <= availableStock`
- `priceSnapshot` captured from variant.price (or product.price if no variant)

---

### PATCH /cart/items/:itemId | تحديث الكمية

**Auth Required:** Yes

**Request Body:**
```json
{ "quantity": 3 }
```

**Notes:** `quantity: 0` removes the item. Stock re-validated against new quantity.

---

### DELETE /cart/items/:itemId | حذف عنصر

**Auth Required:** Yes

Returns refreshed cart after deletion.

---

### DELETE /cart | تفريغ السلة

**Auth Required:** Yes

Removes all items. Cart row kept.

---

## Orders Module | وحدة الطلبات

Base path: `/orders`

---

### POST /orders | تقديم طلب

**Auth Required:** Customer or Vendor

**Request Body:**
```json
{
  "addressId": "uuid",
  "paymentMethod": "cod",
  "couponCode": "WELCOME15",
  "notes": "Please leave at door"
}
```

OR with inline address:
```json
{
  "shippingAddress": {
    "recipientName": "Ahmed Ali",
    "phone": "+971501234567",
    "street": "123 Main St",
    "city": "Dubai",
    "country": "AE"
  },
  "paymentMethod": "bank_transfer"
}
```

**Payment Methods:** `cod` (Cash on Delivery), `bank_transfer`, `online`

**Full Order Flow:**
1. Validates cart is not empty
2. Validates all products are active and vendors approved
3. Validates stock for every item
4. Resolves shipping address (saved or inline)
5. Validates coupon (if provided)
6. Computes: subtotal → discount → tax (0) → shipping (0) → total
7. Transaction: creates Order + OrderItems + VendorCommissions + StatusHistory + CouponUsage + decrements stock + clears cart

**Response 201:** Full order detail

---

### GET /orders | طلباتي

**Auth Required:** Yes

**Query Params:** `page`, `limit`, `status`

---

### GET /orders/:orderNumber | تفاصيل طلب

**Auth Required:** Yes (own orders) or Admin

**Response includes:** items, status history, shipping address

---

### DELETE /orders/:orderNumber | إلغاء طلب

**Auth Required:** Customer (own order)

**Business Rules:**
- Only cancellable from `pending` or `confirmed` status
- Stock restored for all items on cancellation

---

### GET /orders/vendor/items | عناصر الطلبات (بائع)

**Auth Required:** Vendor only

**Query Params:** `page`, `limit`, `status`

Returns all order items belonging to this vendor across all orders, with order context.

---

### PATCH /orders/vendor/items/:itemId/status | تحديث حالة العنصر

**Auth Required:** Vendor only

**Request Body:**
```json
{ "status": "confirmed" }
```

**Vendor-allowed transitions:**
- `pending` → `confirmed`
- `confirmed` → `processing`
- `processing` → `shipped`

---

### GET /orders/admin | كل الطلبات (مدير)

**Auth Required:** Admin only

**Query Params:** `page`, `limit`, `status`, `paymentStatus`, `search` (order number / customer email), `from` (ISO datetime), `to` (ISO datetime)

---

### PATCH /orders/admin/:orderNumber/status | تحديث حالة الطلب (مدير)

**Auth Required:** Admin only

**Request Body:**
```json
{ "status": "delivered", "note": "Confirmed by customer" }
```

**Order Status Flow:**
```
pending → confirmed → processing → shipped → delivered → refunded
pending → cancelled
confirmed → cancelled
processing → cancelled
shipped → delivered (only)
```

---

## Shipping Module | وحدة الشحن

Base path: `/shipping`

---

### GET /shipping/methods/available | طرق الشحن المتاحة

**Auth Required:** No

**Query Params:**

| Param | Required | Description |
|-------|----------|-------------|
| `country` | Yes | 2-letter ISO code (e.g. `AE`) |
| `orderSubtotal` | No | Order total to check free shipping eligibility |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": { "en": "Standard Shipping", "ar": "شحن عادي" },
      "minDays": 3,
      "maxDays": 7,
      "originalPrice": 25.00,
      "effectivePrice": 0,
      "isFreeForThisOrder": true,
      "minOrderForFree": 200.00
    }
  ]
}
```

---

### GET /shipping/zones | مناطق الشحن

**Auth Required:** Admin only

---

### POST /shipping/zones | إنشاء منطقة شحن

**Auth Required:** Admin only

**Request Body:**
```json
{
  "name": "Gulf Countries",
  "countries": ["AE", "SA", "KW", "QA", "BH", "OM"],
  "isActive": true
}
```

---

### PATCH /shipping/zones/:id | تحديث منطقة شحن

**Auth Required:** Admin only

---

### DELETE /shipping/zones/:id | حذف منطقة شحن

**Auth Required:** Admin only

**Guard:** Blocked if zone has active methods.

---

### GET /shipping/methods | طرق الشحن

**Auth Required:** Admin only

**Query Params:** `zoneId` (optional filter)

---

### POST /shipping/methods | إنشاء طريقة شحن

**Auth Required:** Admin only

**Request Body:**
```json
{
  "zoneId": "uuid",
  "name": { "en": "Express Delivery", "ar": "توصيل سريع" },
  "minDays": 1,
  "maxDays": 2,
  "price": 50.00,
  "isFree": false,
  "minOrderForFree": 500.00,
  "isActive": true
}
```

---

### PATCH /shipping/methods/:id | تحديث طريقة شحن

**Auth Required:** Admin only

---

### DELETE /shipping/methods/:id | حذف طريقة شحن

**Auth Required:** Admin only

**Notes:** If method has usage history → soft-deactivate. Otherwise hard-delete.

---

### POST /shipping/shipments | إنشاء شحنة

**Auth Required:** Vendor only

**Request Body:**
```json
{
  "orderId": "uuid",
  "shippingMethodId": "uuid",
  "carrier": "Aramex",
  "trackingNumber": "ARX123456789",
  "trackingUrl": "https://track.aramex.com/ARX123456789",
  "estimatedDelivery": "2024-01-15T00:00:00.000Z"
}
```

**Guards:** Vendor must have items in the order. One shipment per vendor per order.

---

### PATCH /shipping/shipments/:id | تحديث شحنة

**Auth Required:** Vendor or Admin

**Shipment Status Flow:**
```
preparing → shipped → in_transit → out_for_delivery → delivered
Any state → failed
failed → preparing (retry)
```

**Notes:** `shippedAt` and `deliveredAt` timestamps set automatically on transition.

---

### GET /shipping/shipments/:id | تفاصيل شحنة

**Auth Required:** Customer (order owner), Vendor (own), or Admin

---

### GET /shipping/shipments/order/:orderNumber | شحنات طلب

**Auth Required:** Customer (order owner) or Admin

---

## Reviews Module | وحدة التقييمات

Base path: `/reviews`

---

### GET /reviews/product/:productSlug | تقييمات منتج

**Auth Required:** No

**Query Params:**

| Param | Values | Default |
|-------|--------|---------|
| `page` | number | 1 |
| `limit` | number | 10 |
| `sort` | `newest`, `oldest`, `highest`, `lowest`, `helpful` | `newest` |
| `rating` | 1–5 | all |

**Response 200:**
```json
{
  "data": [ ... reviews ... ],
  "meta": { "total": 89, "page": 1, "limit": 10, "totalPages": 9 },
  "stats": {
    "averageRating": 4.3,
    "totalReviews": 89,
    "distribution": { "1": 2, "2": 5, "3": 8, "4": 30, "5": 44 }
  }
}
```

**Notes:** Only `status: approved` reviews returned.

---

### POST /reviews | كتابة تقييم

**Auth Required:** Yes

**Request Body:**
```json
{
  "productId": "uuid",
  "orderId": "uuid",
  "rating": 5,
  "title": "Excellent product!",
  "content": "Very satisfied with the quality and fast delivery.",
  "media": [
    { "url": "https://cdn.example.com/review1.jpg", "type": "image" }
  ]
}
```

**Business Rules:**
- One review per user per product per order (`@@unique`)
- `orderId` provided → system verifies purchase → `isVerifiedPurchase: true`
- Review starts as `status: pending` (requires admin approval)
- Max 5 media attachments (image or video)

---

### PATCH /reviews/:id | تحديث تقييم

**Auth Required:** Customer (own review)

**Guards:** Cannot edit rejected reviews. Editing resets status to `pending` for re-moderation.

---

### DELETE /reviews/:id | حذف تقييم

**Auth Required:** Customer (own) or Admin

---

### POST /reviews/:id/helpful | تقييم مفيد

**Auth Required:** Yes (any)

Increments `helpfulCount` by 1. Only works on approved reviews.

---

### GET /reviews | كل التقييمات (مدير)

**Auth Required:** Admin only

**Query Params:** `page`, `limit`, `status`, `productId`, `vendorId`

---

### PATCH /reviews/:id/approve | قبول تقييم

**Auth Required:** Admin only

---

### PATCH /reviews/:id/reject | رفض تقييم

**Auth Required:** Admin only

---

## Promotions Module | وحدة العروض

Base path: `/promotions`

---

### GET /promotions/validate | التحقق من كود الخصم

**Auth Required:** Yes

**Query Params:**

| Param | Required | Description |
|-------|----------|-------------|
| `code` | Yes | Coupon code (auto-uppercased) |
| `subtotal` | No | Order subtotal for discount preview |

**Response 200:**
```json
{
  "data": {
    "valid": true,
    "promotionId": "uuid",
    "code": "WELCOME15",
    "discountType": "percentage",
    "discountValue": 15,
    "discountAmount": 150.00,
    "finalTotal": 850.00,
    "minPurchaseAmount": 200,
    "maxDiscountAmount": 500
  }
}
```

---

### GET /promotions/vendor | عروض متجري

**Auth Required:** Vendor only

**Query Params:** `page`, `limit`, `type`, `isActive`, `search`

---

### POST /promotions/vendor | إنشاء عرض (بائع)

**Auth Required:** Vendor only

**Request Body:**
```json
{
  "name": { "en": "Summer Sale", "ar": "تخفيضات الصيف" },
  "type": "coupon",
  "code": "SUMMER20",
  "discountType": "percentage",
  "discountValue": 20,
  "minPurchaseAmount": 100,
  "maxDiscountAmount": 200,
  "usageLimitTotal": 500,
  "usageLimitPerUser": 1,
  "startsAt": "2024-06-01T00:00:00.000Z",
  "endsAt": "2024-08-31T23:59:59.000Z"
}
```

**Promotion Types:** `coupon`, `flash_sale`, `percentage_off`, `bundle`
**Discount Types:** `percentage`, `fixed`

---

### PATCH /promotions/vendor/:id | تحديث عرض (بائع)

**Auth Required:** Vendor (own promotion)

**Guard:** Cannot change `discountValue` if promotion has been used.

---

### DELETE /promotions/vendor/:id | حذف عرض (بائع)

**Auth Required:** Vendor (own)

**Notes:** If used → deactivated (soft). Otherwise hard-deleted.

---

### GET /promotions | كل العروض (مدير)

**Auth Required:** Admin only

**Query Params:** `page`, `limit`, `type`, `isActive`, `vendorId`, `search`

---

### POST /promotions | إنشاء عرض (مدير)

**Auth Required:** Admin only

**Notes:** Admin can create platform-wide promotions (`vendorId: null`) or assign to vendor.

---

### GET /promotions/:id | تفاصيل عرض (مدير)

**Auth Required:** Admin only

Includes last 5 usages with user and order info.

---

### PATCH /promotions/:id | تحديث عرض (مدير)

**Auth Required:** Admin only

---

### DELETE /promotions/:id | حذف عرض (مدير)

**Auth Required:** Admin only

---

## Notifications Module | وحدة الإشعارات

Base path: `/notifications`

**All routes require authentication.**

---

### GET /notifications/unread-count | عدد الإشعارات غير المقروءة

**Auth Required:** Yes

**Response 200:**
```json
{ "data": { "unreadCount": 7 } }
```

**Use case:** Header badge polling (lightweight — single count query).

---

### PATCH /notifications/read-all | تحديد الكل كمقروء

**Auth Required:** Yes

**Response 200:**
```json
{ "data": { "markedRead": 7 } }
```

---

### POST /notifications/broadcast | إرسال إشعار جماعي

**Auth Required:** Admin only

**Request Body:**
```json
{
  "type": "promotion",
  "title": { "en": "New Offers Available!", "ar": "عروض جديدة متاحة!" },
  "body": { "en": "Check out our latest summer deals.", "ar": "تحقق من أحدث عروض الصيف." },
  "data": { "promotionId": "uuid" },
  "userIds": ["uuid1", "uuid2"]
}
```

**Notes:** `userIds` omitted → sent to ALL active users (batched in chunks of 500).

**Notification Types:** `order`, `payment`, `review`, `message`, `promotion`, `system`

---

### GET /notifications | قائمة الإشعارات

**Auth Required:** Yes

**Query Params:** `page`, `limit`, `isRead` (boolean), `type`

**Response includes:** `unreadCount` in response alongside paginated list.

---

### DELETE /notifications | حذف كل الإشعارات

**Auth Required:** Yes

---

### PATCH /notifications/:id/read | تحديد إشعار كمقروء

**Auth Required:** Yes (own notification)

---

### DELETE /notifications/:id | حذف إشعار

**Auth Required:** Yes (own notification)

---

## Automatic Notifications | الإشعارات التلقائية

The system fires these notifications automatically without frontend involvement:

| Trigger | Recipient | Type | EN Message | AR Message |
|---------|-----------|------|-----------|-----------|
| Order placed | Customer | `order` | Your order HGT-... has been placed | تم تقديم طلبك HGT-... |
| Order status changed | Customer | `order` | Your order HGT-... status: confirmed | تغيرت حالة طلبك HGT-... |
| Vendor approved | Vendor owner | `system` | Your store has been approved | تمت الموافقة على متجرك |
| Review approved | Customer | `review` | Your review has been approved | تمت الموافقة على مراجعتك |
| New message | Recipient | `message` | New message from [name] | رسالة جديدة من [الاسم] |

---

*Documentation generated for Hagatna Multi-Vendor E-Commerce Platform v1.0.0*
