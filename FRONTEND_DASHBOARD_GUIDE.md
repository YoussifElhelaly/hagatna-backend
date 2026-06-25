# Hagatna — Frontend Dashboard Guide
## Admin Dashboard & Vendor Dashboard — Complete Screen-by-Screen Spec

> هذا الدليل يشرح كل screen، الـ endpoints المستخدمة، البيانات الجاية، وشكل الـ UI المفروض يكون عليه.

---

## جدول المحتويات
1. [Admin Dashboard](#admin)
   - [Overview / Home](#admin-overview)
   - [إدارة البائعين](#admin-vendors)
   - [إدارة المنتجات](#admin-products)
   - [إدارة الطلبات](#admin-orders)
   - [الاسترجاعات](#admin-returns)
   - [المالية — Payouts](#admin-payouts)
   - [المستخدمون](#admin-users)
   - [التقييمات](#admin-reviews)
   - [برنامج النقاط](#admin-loyalty)
   - [خطط البائعين](#admin-plans)
   - [الشحن والإعدادات](#admin-shipping)
   - [إعدادات المنصة](#admin-settings)
   - [الإشعارات — Broadcast](#admin-notifications)

2. [Vendor Dashboard](#vendor)
   - [Overview / Home](#vendor-overview)
   - [منتجاتي](#vendor-products)
   - [طلباتي](#vendor-orders)
   - [التقييمات](#vendor-reviews)
   - [أرباحي](#vendor-earnings)
   - [مكتبة الصور](#vendor-media)
   - [الكوبونات](#vendor-promotions)
   - [المحادثات](#vendor-chat)
   - [الملف الشخصي](#vendor-profile)

---

# ADMIN DASHBOARD {#admin}

---

## 1. Overview / Home {#admin-overview}

### الـ Endpoint
```
GET /api/v1/admin/analytics/overview
```

### الـ Response
```json
{
  "totalRevenue": 125000,
  "totalPlatformIncome": 12500,
  "totalOrders": 340,
  "completedOrders": 280,
  "pendingOrders": 45,
  "averageOrderValue": 446.43,
  "refundRate": 2.35,
  "conversionRate": 73.12,
  "totalUsers": 1820,
  "totalVendors": 38,
  "totalProducts": 512,
  "pendingProducts": 14,
  "totalReviews": 890,
  "pendingReviews": 22,
  "totalReturns": 8,
  "pendingReturns": 3,
  "activeCarts": 102
}
```

### شكل الـ UI
**Cards Row (أرقام كبيرة):**
| Card | الحقل | اللون |
|---|---|---|
| إجمالي المبيعات (GMV) | `totalRevenue` | أخضر |
| إيراد المنصة | `totalPlatformIncome` | أزرق |
| إجمالي الطلبات | `totalOrders` | رمادي |
| متوسط قيمة الطلب | `averageOrderValue` | بنفسجي |
| المستخدمون | `totalUsers` | تركوازي |
| البائعون | `totalVendors` | برتقالي |

**Badges تحتاج action فوري:**
- `pendingProducts` منتجات في انتظار الموافقة → رابط لصفحة المنتجات
- `pendingOrders` طلبات pending → رابط للطلبات
- `pendingReviews` تقييمات في انتظار المراجعة → رابط للتقييمات
- `pendingReturns` استرجاعات معلقة → رابط للاسترجاعات

**KPI Row:**
- Conversion Rate: `conversionRate%` — Progress bar
- Refund Rate: `refundRate%` — نسبة صغيرة = جيد
- Active Carts: `activeCarts` — عملاء ممكن تستهدفهم

### Charts — استدعاءات إضافية

**Revenue Chart (Line Chart):**
```
GET /api/v1/admin/analytics/revenue?from=2024-01-01&to=2024-12-31
```
Response:
```json
[
  { "date": "2024-01-01T00:00:00.000Z", "revenue": 4200, "orders": 12 },
  { "date": "2024-01-02T00:00:00.000Z", "revenue": 3800, "orders": 9 }
]
```
→ X-axis: تاريخ، Y-axis: revenue، خط ثاني للـ orders

**Top Products (Bar Chart):**
```
GET /api/v1/admin/analytics/top-products?limit=5
```
Response:
```json
[
  {
    "product": { "id": "...", "name": {"en":"iPhone Case"}, "slug": "iphone-case", "images": [{"url":"..."}], "vendor": {"storeName":{"en":"TechStore"}} },
    "totalOrders": 45,
    "totalRevenue": 2250
  }
]
```

**Top Vendors (Bar Chart):**
```
GET /api/v1/admin/analytics/top-vendors?limit=5
```
Response:
```json
[
  {
    "vendor": { "id": "...", "storeName": {"en":"TechStore"}, "storeSlug": "techstore", "logo": "url" },
    "totalOrders": 180,
    "totalRevenue": 45000
  }
]
```

**Users Growth (Area Chart):**
```
GET /api/v1/admin/analytics/users-growth?from=2024-01-01&to=2024-12-31
```
Response:
```json
[
  { "date": "2024-01-01T00:00:00.000Z", "newUsers": 15 }
]
```

---

## 2. إدارة البائعين {#admin-vendors}

### أ. قائمة البائعين
```
GET /api/v1/vendors?status=pending&page=1&limit=20
```
**Query params:** `status` (pending | approved | rejected | suspended), `search`, `page`, `limit`

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "storeName": {"en": "TechStore", "ar": "تك ستور"},
      "storeSlug": "techstore",
      "logo": "https://...",
      "status": "pending",
      "commissionRate": 10,
      "productCount": 24,
      "createdAt": "2024-01-15T...",
      "user": { "id": "...", "name": "Ahmed", "email": "ahmed@..." },
      "plan": { "id": "...", "name": "Professional", "maxProducts": 100 },
      "rejectionReason": null
    }
  ],
  "meta": { "total": 38, "page": 1, "limit": 20, "totalPages": 2 }
}
```

**UI:** Table مع columns:
- Logo + اسم المتجر
- البائع (اسم + إيميل)
- الخطة
- العمولة %
- عدد المنتجات
- الحالة (Badge ملون)
- تاريخ التسجيل
- Actions: عرض، موافقة، رفض، إيقاف

**Tabs للفلترة:** All | Pending | Approved | Rejected | Suspended

---

### ب. تفاصيل بائع

**الـ Endpoints:**
```
GET /api/v1/vendors/:id                      ← البروفايل الكامل
GET /api/v1/vendors/:id/stats                ← إحصائيات
GET /api/v1/vendors/:id/products?page=1      ← منتجاته
GET /api/v1/vendors/:id/orders?page=1        ← طلباته
GET /api/v1/admin/commissions/summary?vendorId=:id  ← ملخص مالي
```

**Response — stats:**
```json
{
  "totalProducts": 24,
  "totalOrders": 180,
  "totalRevenue": 45000,
  "completedOrders": 160,
  "pendingOrders": 12,
  "averageRating": 4.3
}
```

**Response — commissions summary:**
```json
{
  "vendor": { "id": "...", "storeName": {...} },
  "totalGross": 45000,
  "totalCommission": 4500,
  "totalNet": 40500,
  "pendingAmount": 12000,
  "paidAmount": 28500
}
```

**UI:** صفحة بـ tabs:
1. **Overview** — البروفايل + KPIs cards
2. **Products** — جدول المنتجات مع filter بالـ status
3. **Orders** — جدول الطلبات
4. **Financial** — ملخص مالي + زر "صرف مستحقات"

**Actions:**
```
PATCH /api/v1/vendors/:id/approve
PATCH /api/v1/vendors/:id/reject   Body: { "rejectionReason": "..." }
PATCH /api/v1/vendors/:id/suspend
PATCH /api/v1/vendors/:id/commission  Body: { "commissionRate": 12 }
```

---

## 3. إدارة المنتجات {#admin-products}

### أ. قائمة المنتجات pending
```
GET /api/v1/products/admin/queue?page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "name": {"en":"Product Name"},
      "slug": "product-name",
      "price": 150,
      "status": "pending_approval",
      "vendor": { "id": "...", "storeName": {...} },
      "category": { "id": "...", "name": {...} },
      "images": [{ "url": "..." }],
      "createdAt": "..."
    }
  ]
}
```

**Actions للمنتج (single):**
```
PATCH /api/v1/products/:id/approve
PATCH /api/v1/products/:id/reject    Body: { "approvalNote": "السبب" }
PATCH /api/v1/products/:id/feature   ← تمييز المنتج
```

### ب. Admin Bulk Update
```
PATCH /api/v1/products/admin/bulk
Body:
{
  "ids": ["product-uuid-1", "product-uuid-2", "product-uuid-3"],
  "update": {
    "price": 120,
    "comparePrice": 150,
    "stockQuantity": 50,
    "lowStockThreshold": 5,
    "categoryId": "cat-uuid",
    "status": "published",
    "isFeatured": true,
    "tags": ["sale", "featured"]
  }
}
```
*(بعث الحقول اللي عايز تغيّرها بس — مش لازم كلهم)*

**كل الحقول المسموح بتحديثها bulk (admin):**
| الحقل | النوع | الوصف |
|---|---|---|
| `price` | number | السعر الجديد |
| `comparePrice` | number \| null | السعر قبل الخصم (يظهر مشطوب) |
| `stockQuantity` | integer | الكمية في المخزن |
| `lowStockThreshold` | integer | حد تنبيه انخفاض المخزن |
| `categoryId` | uuid | نقل لفئة مختلفة |
| `status` | enum | published \| rejected \| archived \| draft \| pending_approval |
| `isFeatured` | boolean | تمييز أو إزالة التمييز |
| `tags` | string[] | وسوم المنتج |

**Response:**
```json
{ "data": { "updated": 3 } }
```

**UI:** Checkbox في أول كل صف → يظهر action bar + drawer لما تختار أكثر من منتج:
- Quick actions: "Approve" / "Reject" / "Feature" / "Archive"
- "Edit Fields" → يفتح drawer فيه inputs للسعر والـ stock والفئة والـ tags

**UI:** جدول مع صورة المنتج، الاسم، البائع، السعر، التاريخ، وأزرار Approve/Reject

---

## 4. إدارة الطلبات {#admin-orders}

### أ. قائمة الطلبات
```
GET /api/v1/orders/admin?status=pending&paymentStatus=completed&search=HGT-&from=&to=&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "orderNumber": "HGT-20240115-A3K9F",
      "status": "pending",
      "paymentStatus": "completed",
      "total": 450,
      "paymentMethod": "card",
      "shippingAddress": { "city": "Cairo", "street": "..." },
      "user": { "id": "...", "name": "Ahmed", "email": "..." },
      "createdAt": "..."
    }
  ]
}
```

**Filters:** Status (pending | confirmed | processing | shipped | delivered | cancelled), Payment Status, Search (order number), Date range

---

### ب. تفاصيل طلب
```
GET /api/v1/orders/admin/:orderNumber
```

**Response:**
```json
{
  "orderNumber": "HGT-20240115-A3K9F",
  "status": "processing",
  "paymentStatus": "completed",
  "subtotal": 400,
  "taxAmount": 56,
  "shippingFee": 30,
  "discountAmount": 40,
  "pointsDiscount": 0,
  "total": 446,
  "paymentMethod": "card",
  "shippingAddress": { "street": "...", "city": "Cairo", "country": "EG" },
  "notes": "...",
  "user": { "id": "...", "name": "Ahmed", "email": "...", "phone": "..." },
  "items": [
    {
      "id": "...",
      "vendorId": "...",
      "productSnapshot": { "name": "iPhone Case", "sku": "..." },
      "quantity": 2,
      "unitPrice": 150,
      "subtotal": 300,
      "status": "processing"
    }
  ],
  "statusHistory": [
    { "previousStatus": null, "newStatus": "pending", "createdAt": "..." }
  ]
}
```

**Action:**
```
PATCH /api/v1/orders/admin/:orderNumber/status
Body: { "status": "confirmed", "note": "Confirmed by admin" }
```

---

## 5. الاسترجاعات {#admin-returns}

### قائمة الاسترجاعات
```
GET /api/v1/returns/admin?status=pending&page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "reason": "damaged",
      "description": "Product arrived broken",
      "status": "pending",
      "refundAmount": 150,
      "createdAt": "...",
      "order": { "orderNumber": "HGT-..." },
      "user": { "name": "...", "email": "..." }
    }
  ]
}
```

**Actions:**
```
PATCH /api/v1/returns/admin/:id/approve   Body: { "refundAmount": 150, "note": "..." }
PATCH /api/v1/returns/admin/:id/reject    Body: { "note": "سبب الرفض" }
```

---

## 6. المالية — Payouts {#admin-payouts}

### أ. قائمة المدفوعات
```
GET /api/v1/admin/payouts?status=pending&vendorId=&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "grossAmount": 1500,
      "commissionRate": 10,
      "commissionAmount": 150,
      "netAmount": 1350,
      "status": "pending",
      "paidAt": null,
      "paymentProof": null,
      "createdAt": "...",
      "vendor": { "id": "...", "storeName": {...}, "storeSlug": "..." },
      "order": { "orderNumber": "HGT-..." }
    }
  ]
}
```

### ب. موافقة على payout مع رفع إيصال
```
PATCH /api/v1/admin/payouts/:id/approve
Content-Type: multipart/form-data
Field: image (optional — صورة الإيصال)
```

**UI:** Modal يظهر تفاصيل المبلغ + زر لرفع صورة + زر Approve

---

## 7. المستخدمون {#admin-users}

```
GET /api/v1/users?search=&role=customer&isActive=true&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "name": "Ahmed Mohamed",
      "email": "ahmed@...",
      "phone": "+201...",
      "role": "customer",
      "isActive": true,
      "createdAt": "..."
    }
  ]
}
```

**Actions:**
```
PATCH /api/v1/users/:id/status    Body: { "isActive": false }
PATCH /api/v1/users/bulk/status   Body: { "ids": ["...", "..."], "isActive": false }
GET   /api/v1/users/:id           ← تفاصيل مستخدم
```

---

## 8. التقييمات {#admin-reviews}

```
GET /api/v1/reviews?status=pending&productId=&vendorId=&page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "rating": 4,
      "title": "Good product",
      "content": "Arrived on time...",
      "status": "pending",
      "isVerifiedPurchase": true,
      "createdAt": "...",
      "user": { "name": "...", "avatar": "..." },
      "product": { "name": {...}, "slug": "..." }
    }
  ]
}
```

**Actions:**
```
PATCH /api/v1/reviews/:id/approve
PATCH /api/v1/reviews/:id/reject
```

---

## 9. برنامج النقاط {#admin-loyalty}

### عرض وتعديل الإعدادات
```
GET  /api/v1/loyalty/settings
PATCH /api/v1/loyalty/settings
```

**Response:**
```json
{
  "id": "singleton",
  "earnRatePercent": 5,
  "pointValue": 0.5,
  "minRedeemPoints": 100,
  "maxRedeemPercent": 50
}
```

**Body للتعديل:**
```json
{
  "earnRatePercent": 5,
  "pointValue": 0.5,
  "minRedeemPoints": 100,
  "maxRedeemPercent": 50
}
```

### إدارة نقاط مستخدم
```
GET  /api/v1/loyalty/admin/users/:userId         ← balance + history
POST /api/v1/loyalty/admin/users/:userId/adjust  ← إضافة/خصم نقاط
```

**Body للـ adjust:**
```json
{
  "points": 100,
  "description": "Compensation for delayed order"
}
```
*(points سالب = خصم، موجب = إضافة)*

---

## 10. خطط البائعين {#admin-plans}

```
GET    /api/v1/vendor-plans/admin/all
POST   /api/v1/vendor-plans
PATCH  /api/v1/vendor-plans/:id
DELETE /api/v1/vendor-plans/:id
```

**Body لإنشاء خطة:**
```json
{
  "name": {"en": "Professional", "ar": "احترافي"},
  "description": {"en": "Up to 100 products"},
  "price": 299,
  "maxProducts": 100,
  "categoryIds": ["cat-uuid-1", "cat-uuid-2"],
  "isActive": true
}
```

---

## 11. الشحن والفئات {#admin-shipping}

### Shipping Zones
```
GET/POST/PATCH/DELETE /api/v1/shipping/zones
```
**Body لإنشاء zone:**
```json
{
  "name": "Cairo",
  "countries": ["EG"],
  "isActive": true
}
```

### Shipping Methods
```
GET/POST/PATCH/DELETE /api/v1/shipping/methods
```
**Body لإنشاء method:**
```json
{
  "zoneId": "...",
  "name": {"en": "Standard Shipping"},
  "description": {"en": "3-5 business days"},
  "price": 30,
  "estimatedDays": 5,
  "isActive": true
}
```

### Categories
```
GET/POST/PATCH/DELETE /api/v1/categories
```

---

## 12. إعدادات المنصة {#admin-settings}

```
GET  /api/v1/admin/settings
PATCH /api/v1/admin/settings
```

**Response:**
```json
{
  "id": "singleton",
  "platformName": {"en": "Hagatna", "ar": "هاجتنا"},
  "logo": "https://...",
  "favicon": "https://...",
  "currency": "EGP",
  "taxRate": 14,
  "maintenanceMode": false,
  "supportEmail": "support@hagatna.com",
  "supportPhone": "+201...",
  "termsUrl": "https://...",
  "privacyUrl": "https://...",
  "maxCartItems": 50,
  "updatedAt": "..."
}
```

**UI:** صفحة Settings مع sections:
1. **عام** — اسم المنصة، شعار، favicon، عملة
2. **مالية** — نسبة الضريبة
3. **تواصل** — إيميل دعم، رقم هاتف
4. **سياسات** — روابط الشروط والخصوصية
5. **الصيانة** — toggle لتفعيل Maintenance Mode

---

## 13. الإشعارات — Broadcast {#admin-notifications}

```
POST /api/v1/notifications/broadcast
Body:
{
  "title": "عرض خاص",
  "message": "خصم 20% على كل المنتجات اليوم فقط",
  "type": "promotion",
  "targetRoles": ["customer"]   // ["customer"] | ["vendor"] | ["customer","vendor"]
}
```

---

---

# VENDOR DASHBOARD {#vendor}

---

## 1. Overview / Home {#vendor-overview}

```
GET /api/v1/vendors/me/analytics/overview
```

**Response:**
```json
{
  "totalOrders": 180,
  "totalGrossRevenue": 45000,
  "totalNetRevenue": 40500,
  "pendingPayout": 12000,
  "pendingOrders": 12,
  "activeProducts": 24,
  "pendingProducts": 2,
  "averageRating": 4.3,
  "totalReviews": 89,
  "totalReturns": 3
}
```

**UI — Cards Row:**
| Card | الحقل | الوصف |
|---|---|---|
| إجمالي المبيعات | `totalGrossRevenue` | GMV البائع |
| صافي أرباحي | `totalNetRevenue` | بعد خصم العمولة |
| مستحقات قادمة | `pendingPayout` | في انتظار صرف Admin |
| طلبات جديدة | `pendingOrders` | تحتاج تأكيد فوري |
| متوسط التقييم | `averageRating` | من 5 نجوم |

**Revenue Chart:**
```
GET /api/v1/vendors/me/analytics/revenue?from=2024-01-01&to=2024-12-31
```
Response: `[{ "date": "...", "revenue": 1500, "orders": 8 }]`

**Top Products:**
```
GET /api/v1/vendors/me/analytics/top-products?limit=5
```
Response:
```json
[
  {
    "product": { "id": "...", "name": {...}, "slug": "...", "price": 150, "images": [...] },
    "totalOrders": 45,
    "totalRevenue": 6750
  }
]
```

---

## 2. منتجاتي {#vendor-products}

### قائمة المنتجات
```
GET /api/v1/products/vendor/me?status=published&page=1&limit=20&search=
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "name": {"en": "iPhone Case"},
      "slug": "iphone-case",
      "price": 150,
      "stock": 45,
      "status": "published",
      "isFeatured": false,
      "createdAt": "...",
      "images": [{ "url": "..." }],
      "category": { "name": {...} },
      "_count": { "reviews": 12, "orderItems": 45 }
    }
  ]
}
```

**Status الممكنة:** `draft` | `pending_approval` | `published` | `rejected` | `archived`

**Actions (single product):**
```
POST   /api/v1/products                      ← إنشاء منتج جديد
PATCH  /api/v1/products/:id                  ← تعديل منتج
PATCH  /api/v1/products/:id/status           Body: { "status": "pending_approval" }
DELETE /api/v1/products/:id                  ← حذف ناعم
PUT    /api/v1/products/:id/images           ← تحديث صور المنتج
```

### Vendor Bulk Update
```
PATCH /api/v1/products/bulk
Body:
{
  "ids": ["product-uuid-1", "product-uuid-2"],
  "update": {
    "price": 99,
    "comparePrice": 120,
    "stockQuantity": 30,
    "lowStockThreshold": 5,
    "categoryId": "cat-uuid",
    "status": "pending_approval",
    "tags": ["new", "sale"]
  }
}
```
*(بعث الحقول اللي عايز تغيّرها بس)*

**كل الحقول المسموح بتحديثها bulk (vendor):**
| الحقل | النوع | الوصف |
|---|---|---|
| `price` | number | تغيير السعر |
| `comparePrice` | number \| null | السعر الأصلي قبل الخصم |
| `stockQuantity` | integer | الكمية في المخزن |
| `lowStockThreshold` | integer | حد تنبيه انخفاض المخزن |
| `categoryId` | uuid | نقل لفئة مختلفة |
| `status` | enum | draft \| pending_approval \| archived |
| `tags` | string[] | وسوم المنتج |

> ⚠️ الـ vendor مش قادر يعمل bulk `status: published` — لازم يعمل `pending_approval` وينتظر موافقة الأدمن

**Response:**
```json
{ "data": { "updated": 2 } }
```

**UI:** Checkbox + action bar + drawer:
- Quick: "Submit for Review" / "Archive" / "Draft"
- "Edit Fields" → drawer فيه inputs للسعر، comparePrice، stock، lowStockThreshold، category، tags

**Body لإنشاء منتج:**
```json
{
  "name": {"en": "Product Name", "ar": "اسم المنتج"},
  "description": {"en": "...", "ar": "..."},
  "price": 150,
  "stock": 100,
  "sku": "SKU-001",
  "categoryId": "cat-uuid",
  "images": [
    { "url": "https://...", "altText": "...", "isPrimary": true, "sortOrder": 0 }
  ]
}
```

**Body لتحديث الصور (يحل محل الصور الحالية):**
```json
{
  "images": [
    { "url": "https://...", "altText": "...", "isPrimary": true, "sortOrder": 0 },
    { "url": "https://...", "altText": "...", "isPrimary": false, "sortOrder": 1 }
  ]
}
```
> ملاحظة: URLs الصور تجيبها من الـ Media Library أو ترفع صورة جديدة عبر `POST /api/v1/media`

---

## 3. طلباتي {#vendor-orders}

### قائمة Order Items
```
GET /api/v1/orders/vendor/items?status=pending&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "productSnapshot": { "name": "iPhone Case" },
      "quantity": 2,
      "unitPrice": 150,
      "subtotal": 300,
      "status": "pending",
      "order": {
        "orderNumber": "HGT-20240115-A3K9F",
        "status": "confirmed",
        "paymentStatus": "completed",
        "shippingAddress": { "city": "Cairo" },
        "user": { "name": "Ahmed" }
      }
    }
  ]
}
```

**تحديث حالة Item:**
```
PATCH /api/v1/orders/vendor/items/:itemId/status
Body: { "status": "processing", "note": "Started packing" }
```

**Status flow للـ item:** `pending` → `confirmed` → `processing` → `shipped` → `delivered`

### تفاصيل طلب واحد
```
GET /api/v1/orders/vendor/:orderNumber
```

**Response (بيانات أكثر):**
```json
{
  "orderNumber": "HGT-20240115-A3K9F",
  "status": "confirmed",
  "paymentStatus": "completed",
  "total": 446,
  "shippingAddress": {
    "fullName": "Ahmed Mohamed",
    "street": "123 Main St",
    "city": "Cairo",
    "country": "EG",
    "phone": "+201..."
  },
  "user": { "id": "...", "name": "Ahmed", "email": "...", "phone": "+201..." },
  "items": [
    {
      "id": "...",
      "productSnapshot": { "name": "iPhone Case" },
      "quantity": 2,
      "unitPrice": 150,
      "subtotal": 300,
      "status": "processing",
      "shipments": [
        { "trackingNumber": "EGP123456", "carrier": "Aramex", "status": "in_transit" }
      ]
    }
  ],
  "statusHistory": [...]
}
```

### إنشاء Shipment
```
POST /api/v1/shipping/shipments
Body:
{
  "orderItemId": "...",
  "trackingNumber": "EGP123456789",
  "carrier": "Aramex",
  "estimatedDelivery": "2024-02-01"
}
```

---

## 4. التقييمات {#vendor-reviews}

```
GET /api/v1/reviews/vendor/me?productId=&rating=&status=approved&page=1
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "rating": 5,
      "title": "Excellent!",
      "content": "Fast delivery...",
      "status": "approved",
      "isVerifiedPurchase": true,
      "helpfulCount": 3,
      "createdAt": "...",
      "user": { "name": "Ahmed", "avatar": "..." },
      "product": { "name": {"en":"iPhone Case"}, "slug": "iphone-case" },
      "media": []
    }
  ],
  "meta": { "total": 89, ... }
}
```

**UI:** جدول مع:
- اسم المنتج
- التقييم (نجوم)
- اسم المستخدم
- المحتوى (مقتطف)
- Verified Purchase badge
- التاريخ

**Filter بـ:** productId, rating (1-5), status

---

## 5. أرباحي {#vendor-earnings}

### ملخص الأرباح
```
GET /api/v1/vendors/me/earnings
```

**Response:**
```json
{
  "totalOrders": 180,
  "totalGross": 45000,
  "totalCommission": 4500,
  "totalNet": 40500,
  "totalPaid": 28500,
  "totalPending": 12000
}
```

**UI — Summary Cards:**
- إجمالي المبيعات: `totalGross`
- العمولة المخصومة: `totalCommission`
- صافي الأرباح: `totalNet`
- تم صرفه: `totalPaid` (أخضر)
- في الانتظار: `totalPending` (أصفر)

### تاريخ المدفوعات
```
GET /api/v1/vendors/me/payouts?status=pending&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "grossAmount": 1500,
      "commissionRate": 10,
      "commissionAmount": 150,
      "netAmount": 1350,
      "status": "completed",
      "paidAt": "2024-01-20T...",
      "paymentProof": "https://...",
      "createdAt": "...",
      "order": { "orderNumber": "HGT-..." },
      "orderItem": {
        "quantity": 2,
        "unitPrice": 750,
        "productSnapshot": { "name": "iPhone Case" }
      }
    }
  ]
}
```

**UI:** جدول مع:
- رقم الطلب
- المنتج
- الإجمالي
- العمولة
- الصافي
- الحالة (pending = أصفر, completed = أخضر)
- تاريخ الصرف
- إيصال الدفع (رابط/صورة لو موجود)

---

## 6. مكتبة الصور {#vendor-media}

```
GET /api/v1/media?page=1&limit=20&folder=products
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "url": "https://res.cloudinary.com/...",
      "publicId": "hagatna/products/abc123",
      "filename": "iphone-case.jpg",
      "folder": "products",
      "resourceType": "image",
      "createdAt": "..."
    }
  ]
}
```

**رفع صورة جديدة:**
```
POST /api/v1/media
Content-Type: multipart/form-data
Fields:
  image: <file>
  folder: products    ← أو vendors/logos أو vendors/banners
```

**حذف صورة:**
```
DELETE /api/v1/media/:id
```

**UI:** Grid view للصور مع:
- صورة مصغرة
- اسم الملف
- زر نسخ الـ URL
- زر حذف
- Filter بـ folder
- زر رفع صورة جديدة

---

## 7. الكوبونات {#vendor-promotions}

### قائمة الكوبونات
```
GET /api/v1/promotions/vendor?page=1&limit=20&isActive=true
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "code": "SUMMER20",
      "discountType": "percentage",
      "discountValue": 20,
      "minOrderValue": 200,
      "maxUsage": 100,
      "usageCount": 45,
      "startDate": "2024-06-01",
      "endDate": "2024-08-31",
      "isActive": true
    }
  ]
}
```

### إنشاء كوبون
```
POST /api/v1/promotions/vendor
Body:
{
  "code": "SUMMER20",
  "description": {"en": "Summer Sale"},
  "discountType": "percentage",      ← percentage | fixed_amount | free_shipping
  "discountValue": 20,
  "minOrderValue": 200,
  "maxUsage": 100,
  "startDate": "2024-06-01",
  "endDate": "2024-08-31",
  "isActive": true
}
```

---

## 8. المحادثات {#vendor-chat}

### قائمة المحادثات
```
GET /api/v1/conversations?page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "lastMessageAt": "2024-01-15T...",
      "customer": { "id": "...", "name": "Ahmed", "avatar": "..." },
      "vendor": { "id": "...", "storeName": {...} },
      "order": { "id": "...", "orderNumber": "HGT-..." },
      "_count": { "messages": 2 }   ← عدد الرسائل غير المقروءة
    }
  ]
}
```

### رسائل محادثة
```
GET /api/v1/conversations/:id/messages?page=1&limit=50
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "content": "Hello, when will my order ship?",
      "attachmentUrl": null,
      "isRead": true,
      "createdAt": "...",
      "sender": { "id": "...", "name": "Ahmed", "role": "customer" }
    }
  ]
}
```
*(عند استدعاء هذا الـ endpoint، الرسائل غير المقروءة تتحول تلقائياً لمقروءة)*

### إرسال رسالة
```
POST /api/v1/conversations/:id/messages
Body:
{
  "content": "سيتم الشحن غداً إن شاء الله",
  "attachmentUrl": null,
  "attachmentType": null
}
```

### بدء محادثة جديدة (من جانب العميل)
```
POST /api/v1/conversations
Body:
{
  "vendorId": "vendor-profile-uuid",
  "orderId": "order-uuid"   ← اختياري
}
```
→ يعود بالمحادثة الموجودة أو ينشئ واحدة جديدة

---

## 9. الملف الشخصي {#vendor-profile}

### عرض الملف
```
GET /api/v1/vendors/me
```

**Response:**
```json
{
  "id": "...",
  "storeName": {"en": "TechStore", "ar": "تك ستور"},
  "description": {"en": "Best tech accessories"},
  "storeSlug": "techstore",
  "logo": "https://...",
  "banner": "https://...",
  "address": "123 Street",
  "city": "Cairo",
  "country": "EG",
  "phone": "+201...",
  "commissionRate": 10,
  "status": "approved",
  "plan": {
    "name": "Professional",
    "maxProducts": 100,
    "categories": [{ "id": "...", "name": {...} }]
  },
  "productCount": 24,
  "user": { "name": "Ahmed", "email": "..." }
}
```

### تعديل الملف
```
PATCH /api/v1/vendors/me
Body:
{
  "storeName": {"en": "TechStore Updated"},
  "description": {"en": "Updated description"},
  "logo": "https://...",
  "banner": "https://...",
  "phone": "+201...",
  "address": "New address",
  "city": "Alexandria"
}
```

### رابط المتجر العام
```
GET /api/v1/vendors/store/:slug   ← Public — لعرض preview للبائع
```

---

## نقاط مشتركة يجب الانتباه إليها

### Authentication
كل endpoint (ما عدا الـ Public) يحتاج:
```
Authorization: Bearer <access_token>
```

### Refresh Token
```
POST /api/v1/auth/refresh-token
Body: { "refreshToken": "..." }
Response: { "accessToken": "...", "refreshToken": "..." }
```

### Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Pagination Meta
كل endpoint مع قائمة يرجع:
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### الـ Migrations المطلوبة
شغّل هذه الأوامر بعد كل التعديلات:
```bash
npx prisma migrate dev --name add_media_library
npx prisma migrate dev --name add_platform_settings
```
أو في أمر واحد (لو لم تشغّل أي منهما):
```bash
npx prisma migrate dev --name add_media_and_settings
```

---

*آخر تحديث: يونيو 2026*
