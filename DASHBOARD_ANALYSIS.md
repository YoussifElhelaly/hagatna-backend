# Hagatna — Dashboard Feature Analysis

> تحليل شامل للـ Admin Dashboard والـ Vendor Dashboard — الموجود، الناقص، والـ phases المطلوبة لإكمال كل حاجة.

---

## جدول المحتويات

1. [Admin Dashboard — الموجود](#admin-existing)
2. [Admin Dashboard — الناقص](#admin-missing)
3. [Vendor Dashboard — الموجود](#vendor-existing)
4. [Vendor Dashboard — الناقص](#vendor-missing)
5. [Implementation Phases](#phases)
6. [Endpoint Reference — Complete Map](#endpoint-map)

---

## 1. Admin Dashboard — الموجود {#admin-existing}

### الـ Analytics & KPIs
| الـ Screen | الـ Endpoint | البيانات |
|---|---|---|
| Overview cards | `GET /api/v1/admin/analytics/overview` | GMV، Platform Income، إجمالي الطلبات، pending orders، المستخدمين، البائعين، المنتجات، التقييمات |
| Revenue chart | `GET /api/v1/admin/analytics/revenue?from=&to=` | إيراد يومي + عدد الطلبات في range |
| Top products | `GET /api/v1/admin/analytics/top-products?limit=10` | أكثر منتجات مباعة |
| Top vendors | `GET /api/v1/admin/analytics/top-vendors?limit=10` | أكثر بائعين إيراداً |
| User growth | `GET /api/v1/admin/analytics/users-growth?from=&to=` | تسجيلات جديدة يومياً |
| Abandoned carts | `GET /api/v1/admin/analytics/active-carts` | يوزرز عندهم سلة فيها منتجات ولم يكملوا |

### إدارة البائعين
| الـ Action | الـ Endpoint |
|---|---|
| قائمة البائعين (فلترة بـ status) | `GET /api/v1/vendors?status=pending` |
| تفاصيل بائع واحد | `GET /api/v1/vendors/:id` |
| موافقة على بائع | `PATCH /api/v1/vendors/:id/approve` |
| رفض بائع | `PATCH /api/v1/vendors/:id/reject` |
| إيقاف بائع | `PATCH /api/v1/vendors/:id/suspend` |
| تعديل نسبة العمولة | `PATCH /api/v1/vendors/:id/commission` |
| إحصائيات بائع | `GET /api/v1/vendors/:id/stats` |

### إدارة المنتجات
| الـ Action | الـ Endpoint |
|---|---|
| قائمة المنتجات pending | `GET /api/v1/products/admin/queue` |
| موافقة على منتج | `PATCH /api/v1/products/:id/approve` |
| رفض منتج | `PATCH /api/v1/products/:id/reject` |
| تمييز منتج (featured) | `PATCH /api/v1/products/:id/feature` |
| إنشاء منتج لأي بائع | `POST /api/v1/products/admin` |
| تعديل أي منتج | `PATCH /api/v1/products/admin/:id` |
| Bulk update | `PATCH /api/v1/products/admin/bulk` |
| حذف منتج | `DELETE /api/v1/products/:id` |

### إدارة الطلبات
| الـ Action | الـ Endpoint |
|---|---|
| كل الطلبات (فلترة) | `GET /api/v1/orders/admin` |
| تفاصيل طلب | `GET /api/v1/orders/admin/:orderNumber` |
| تحديث حالة طلب | `PATCH /api/v1/orders/admin/:orderNumber/status` |
| قائمة طلبات الاسترجاع | `GET /api/v1/orders/admin/returns` |
| موافقة استرجاع | `PATCH /api/v1/orders/admin/returns/:id/approve` |
| تنفيذ استرداد | `PATCH /api/v1/orders/admin/returns/:id/refund` |

### المالية والمدفوعات
| الـ Action | الـ Endpoint |
|---|---|
| قائمة payouts (فلترة بـ status/vendor) | `GET /api/v1/admin/payouts` |
| موافقة payout مع إيصال | `PATCH /api/v1/admin/payouts/:id/approve` ← multipart/form-data |
| ملخص عمولات بائع | `GET /api/v1/admin/commissions/summary?vendorId=` |

### المستخدمون
| الـ Action | الـ Endpoint |
|---|---|
| قائمة المستخدمين | `GET /api/v1/users` |
| تفاصيل مستخدم | `GET /api/v1/users/:id` |
| تغيير حالة مستخدم | `PATCH /api/v1/users/:id/status` |
| Bulk status update | `PATCH /api/v1/users/bulk/status` |

### التقييمات
| الـ Action | الـ Endpoint |
|---|---|
| كل التقييمات | `GET /api/v1/reviews` |
| موافقة تقييم | `PATCH /api/v1/reviews/:id/approve` |
| رفض تقييم | `PATCH /api/v1/reviews/:id/reject` |

### الإعدادات
| الـ Action | الـ Endpoint |
|---|---|
| برنامج النقاط | `PATCH /api/v1/loyalty/settings` |
| تفاصيل نقاط مستخدم | `GET /api/v1/loyalty/admin/users/:userId` |
| تعديل رصيد نقاط | `POST /api/v1/loyalty/admin/users/:userId/adjust` |
| خطط البائعين (CRUD) | `GET/POST/PATCH/DELETE /api/v1/vendor-plans` |
| الشحن — zones | `GET/POST/PATCH/DELETE /api/v1/shipping/zones` |
| الشحن — methods | `GET/POST/PATCH/DELETE /api/v1/shipping/methods` |
| كل الشحنات | `GET /api/v1/shipping/shipments` |
| Attributes/Facets | `GET/POST/PATCH/DELETE /api/v1/attributes` |
| الفئات (CRUD) | `GET/POST/PATCH/DELETE /api/v1/categories` |
| Broadcast notification | `POST /api/v1/notifications/broadcast` |
| Media library | `GET/POST/DELETE /api/v1/media` |

---

## 2. Admin Dashboard — الناقص {#admin-missing}

### 🔴 مفقود بالكامل — مش موجود أي endpoint

#### أ. إعدادات المنصة (Platform Settings)
المنصة حالياً مفيهاش أي endpoint لإدارة الإعدادات العامة. كل الـ settings hard-coded أو بتتعمل manually في قاعدة البيانات.

**المطلوب:**
```
GET  /api/v1/admin/settings
PATCH /api/v1/admin/settings
```
**البيانات اللي المفروض تكون فيها:**
- اسم المنصة، الشعار، الألوان
- رقم الشركة / الإيميل الرسمي
- الـ tax rate الافتراضي
- حد أقصى للـ cart items
- هل المنصة في maintenance mode
- عملة المنصة وإعدادات التنسيق

---

#### ب. Dashboard للـ Returns منفصلة (Standalone Returns Module)
حالياً الاسترجاع شغال جزئياً في returns.routes.ts لكن الـ flow مش مكتمل:

**الناقص:**
```
GET  /api/v1/returns/admin           ← موجود ✓
PATCH /api/v1/returns/admin/:id/approve ← موجود ✓
PATCH /api/v1/returns/admin/:id/reject  ← موجود ✓
```
**اللي مفقود:**
- مفيش endpoint لرؤية تفاصيل return واحد من الـ admin side
- مفيش refund amount calculation واضح
- مفيش إضافة ملاحظة على الـ return من الأدمن (admin note)

---

#### ج. إدارة الإشعارات (Notification Management)
الـ admin يقدر يعمل broadcast لكن مفيش:
```
GET  /api/v1/admin/notifications/history  ← مش موجود
```
سجل الـ broadcasts اللي اتبعتت.

---

#### د. تقرير الضرائب / الفواتير (Tax / Invoice Report)
مفيش أي endpoint لتوليد تقارير مالية للضرائب أو إرسال فاتورة للبائع.

---

#### هـ. إدارة Reviews من الـ Admin
الـ admin يقدر يعمل approve/reject لكن مفيش:
- `DELETE /api/v1/reviews/:id` من الـ admin (حذف تام)
- إحصائيات التقييمات per vendor

---

### 🟡 موجود جزئياً — محتاج تحسين

#### أ. Analytics — بيانات ناقصة
الـ overview endpoint بيعطي أرقام لكن مفيهوش:
- **Conversion rate** (عدد الطلبات المكتملة ÷ عدد السلات النشطة)
- **Average Order Value (AOV)**
- **Refund rate** (نسبة الاسترجاعات)
- **Revenue by category** (إيراد لكل فئة)
- **Monthly comparison** (هذا الشهر vs الشهر اللي فات)

**الحل:** توسيع الـ overview endpoint أو إضافة:
```
GET /api/v1/admin/analytics/overview  ← إضافة حقول جديدة
GET /api/v1/admin/analytics/by-category
GET /api/v1/admin/analytics/comparison?period=month
```

---

#### ب. Vendor Detail Page
الـ endpoint `GET /api/v1/vendors/:id` بيرجع الـ profile لكن مفيش:
- المنتجات بتاعته في نفس الرد
- طلباته الأخيرة
- commission history مباشرة في الـ response

**الحل:** إضافة `?include=products,orders,commissions` أو endpoints منفصلة:
```
GET /api/v1/vendors/:id/products  ← مش موجود
GET /api/v1/vendors/:id/orders    ← مش موجود
```

---

#### ج. Order Detail — معلومات ناقصة
الـ `GET /api/v1/orders/admin/:orderNumber` شغال لكن محتاج:
- الـ shipment details مدمجة في الـ response
- تاريخ كل status change (audit trail)

---

#### د. Returns — flow ناقص
```
PATCH /api/v1/returns/admin/:id/reject  ← موجود في returns.routes لكن
                                           مش موجود في orders.routes
```
في الكود فيه تكرار — returns مشتتة بين `orders.routes` و `returns.routes`.

---

## 3. Vendor Dashboard — الموجود {#vendor-existing}

### الملف الشخصي
| الـ Action | الـ Endpoint |
|---|---|
| رؤية الملف الشخصي | `GET /api/v1/vendors/me` |
| تعديل الملف الشخصي | `PATCH /api/v1/vendors/me` |
| إحصائيات سريعة | `GET /api/v1/vendors/me/stats` |
| الأرباح التفصيلية | `GET /api/v1/vendors/me/earnings` |
| تاريخ المدفوعات | `GET /api/v1/vendors/me/payouts` |

### المنتجات
| الـ Action | الـ Endpoint |
|---|---|
| قائمة منتجاتي | `GET /api/v1/products/vendor/me` |
| إنشاء منتج | `POST /api/v1/products` |
| تعديل منتج | `PATCH /api/v1/products/:id` |
| تحديث الحالة (submit/archive) | `PATCH /api/v1/products/:id/status` |
| حذف منتج | `DELETE /api/v1/products/:id` |
| إدارة الصور | `PUT /api/v1/products/:id/images` |
| Bulk update | `PATCH /api/v1/products/bulk` |
| إدارة variants | `POST/PATCH/DELETE /api/v1/products/:id/variants` |
| إدارة attributes | `PUT /api/v1/attributes/product/:productId` |

### الطلبات
| الـ Action | الـ Endpoint |
|---|---|
| طلبات بائعي (items view) | `GET /api/v1/orders/vendor/items` |
| تحديث حالة item | `PATCH /api/v1/orders/vendor/items/:itemId/status` |

### المالية
| الـ Action | الـ Endpoint |
|---|---|
| ملخص الأرباح | `GET /api/v1/vendors/me/earnings` |
| تاريخ المدفوعات + إيصالات | `GET /api/v1/vendors/me/payouts` |

### الشحن
| الـ Action | الـ Endpoint |
|---|---|
| إنشاء shipment | `POST /api/v1/shipping/shipments` |
| تحديث shipment | `PATCH /api/v1/shipping/shipments/:id` |
| الطرق المتاحة | `GET /api/v1/shipping/methods/available` |

### الكوبونات
| الـ Action | الـ Endpoint |
|---|---|
| كوبوناتي | `GET /api/v1/promotions/vendor` |
| إنشاء كوبون | `POST /api/v1/promotions/vendor` |
| تعديل / حذف | `PATCH/DELETE /api/v1/promotions/vendor/:id` |

### المحادثات
| الـ Action | الـ Endpoint |
|---|---|
| محادثاتي مع العملاء | `GET /api/v1/conversations` |
| رسائل محادثة | `GET /api/v1/conversations/:id/messages` |

### الـ Media Library
| الـ Action | الـ Endpoint |
|---|---|
| صوري على Cloudinary | `GET /api/v1/media` |
| رفع صورة جديدة | `POST /api/v1/media` |
| حذف صورة | `DELETE /api/v1/media/:id` |

---

## 4. Vendor Dashboard — الناقص {#vendor-missing}

### 🔴 مفقود بالكامل

#### أ. Analytics خاصة بالبائع
البائع حالياً مش عنده أي analytics عن متجره. الـ `GET /api/v1/vendors/me/stats` بيعطي أرقام ثابتة بس مش كافية.

**المطلوب:**
```
GET /api/v1/vendors/me/analytics/overview
GET /api/v1/vendors/me/analytics/revenue?from=&to=
GET /api/v1/vendors/me/analytics/top-products?limit=10
```
**البيانات المطلوبة:**
- إجمالي مبيعاتي (GMV الخاص بيا)
- صافي أرباحي بعد العمولة
- أكثر منتجاتي مباعة
- إيراد يومي في الفترة الأخيرة
- معدل التقييمات
- عدد الطلبات pending عندي

---

#### ب. إشعارات للـ Vendor عن طلباته
مفيش endpoint للـ vendor يشوف notifications الخاصة بيه عن طلبات جديدة أو status changes.

الـ notification system موجود لكن الـ vendor بيشوف notifications بنفس طريقة أي user عبر:
```
GET /api/v1/notifications
```
لكن مفيش:
```
GET /api/v1/notifications?role=vendor  ← filter خاص بالبائعين
```
*(هذا مش endpoint جديد — بس المنصة لازم تبعت notifications للـ vendor لما ييجي طلب جديد — لازم نتأكد إن `notify.newOrder()` بيبعت للـ vendor)*

---

#### ج. Vendor — إدارة متقدمة للطلبات
الـ vendor حالياً يشوف items فقط مش الـ order كاملة:

**المطلوب:**
```
GET /api/v1/orders/vendor/:orderNumber  ← تفاصيل order كاملة للبائع
```
الـ vendor لازم يشوف: عنوان العميل، طريقة الدفع، تفاصيل العميل للشحن.

---

#### د. Vendor Reviews
البائع مش قادر يشوف تقييمات منتجاته من الـ dashboard.

**المطلوب:**
```
GET /api/v1/reviews/vendor/me?page=1&limit=20
```
يعرض كل تقييمات منتجاته مع إمكانية الـ filter بـ status/product.

---

#### هـ. Vendor — إرسال رسالة لعميل
المحادثات موجودة لكن مفيش endpoint للـ vendor يبدأ محادثة جديدة:
```
POST /api/v1/conversations  ← مش موجود
POST /api/v1/conversations/:id/messages  ← مش موجود
```

---

### 🟡 موجود جزئياً — محتاج تحسين

#### أ. Orders View — ناقصة
`GET /api/v1/orders/vendor/items` بيرجع items مش orders. البائع مش قادر يشوف:
- اسم العميل + تفاصيل التواصل
- الـ shipping address
- الـ payment method
- هل الطلب اتدفع فعلاً

**الحل:** إضافة هذه البيانات في الـ response أو endpoint جديد.

---

#### ب. Earnings — صفحة التفاصيل
`GET /api/v1/vendors/me/earnings` بيرجع ملخص aggregate فقط. محتاج:
- breakdown شهري (هذا الشهر كسبت كام)
- تصدير CSV للحسابات

---

#### ج. Store Profile — public preview
البائع مش قادر يشوف كيف بيظهر متجره للعملاء من الـ dashboard (بدون خروج وفتح الـ public link).

**الحل:** الـ endpoint موجود:
```
GET /api/v1/vendors/store/:slug  ← public
```
بس الـ UI لازم يعرض رابط مباشر للـ vendor لزيارة صفحته.

---

## 5. Implementation Phases {#phases}

### Phase 1 — أهم حاجات ناقصة (أسبوع واحد)
**الأولوية: الحاجات اللي بتأثر على الشغل اليومي**

#### 1.1 Vendor Analytics
```typescript
// vendors.routes.ts — إضافة
GET /api/v1/vendors/me/analytics/overview
GET /api/v1/vendors/me/analytics/revenue?from=&to=
GET /api/v1/vendors/me/analytics/top-products
```
**الـ service:** aggregate من `OrderItem` filtered by `vendorId` + join مع `Product`

#### 1.2 Vendor Order Detail
```typescript
// orders.routes.ts — إضافة
GET /api/v1/orders/vendor/:orderNumber
```
يرجع كل تفاصيل الـ order اللي فيها items للبائع ده — مع عنوان العميل وبيانات الشحن.

#### 1.3 Vendor Reviews
```typescript
// reviews.routes.ts — إضافة
GET /api/v1/reviews/vendor/me?productId=&rating=&page=
```

#### 1.4 Admin Analytics — توسيع overview
إضافة للـ `GET /api/v1/admin/analytics/overview`:
```typescript
{
  // الحقول الموجودة +
  averageOrderValue: number,      // GMV ÷ totalOrders
  refundRate: number,             // returns ÷ completedOrders
  conversionRate: number,         // completedOrders ÷ (completedOrders + activeCarts)
}
```

---

### Phase 2 — تحسينات الجودة (أسبوع 2-3)

#### 2.1 Admin — Vendor Detail Page مكتملة
```typescript
GET /api/v1/vendors/:id/products?page=1   // منتجات البائع
GET /api/v1/vendors/:id/orders?page=1     // طلبات البائع
```

#### 2.2 Vendor — Chat إرسال رسائل
```typescript
POST /api/v1/conversations             // بدء محادثة جديدة
POST /api/v1/conversations/:id/messages // إرسال رسالة
```

#### 2.3 Admin — إضافة حقول لـ Return Detail
```typescript
GET /api/v1/returns/admin/:id  // تفاصيل return واحد
```
وإضافة `adminNote` لعمليتَي الموافقة والرفض.

#### 2.4 توحيد Returns Routes
دمج الـ returns المشتتة بين `orders.routes` و `returns.routes` في مكان واحد واضح.

#### 2.5 تحسين Order Detail
إضافة shipment details وكامل الـ status history في:
```typescript
GET /api/v1/orders/admin/:orderNumber
GET /api/v1/orders/vendor/:orderNumber
```

---

### Phase 3 — Features جديدة (أسبوع 4-5)

#### 3.1 Platform Settings Endpoint
```typescript
// إنشاء settings module جديد
GET  /api/v1/admin/settings
PATCH /api/v1/admin/settings
```
Schema في الـ Prisma:
```prisma
model PlatformSettings {
  id              String   @id @default("singleton")
  platformName    Json     // { en, ar }
  logo            String?
  currency        String   @default("EGP")
  taxRate         Float    @default(0)
  maintenanceMode Boolean  @default(false)
  supportEmail    String?
  updatedAt       DateTime @updatedAt
}
```

#### 3.2 Vendor CSV Export
```typescript
GET /api/v1/vendors/me/earnings/export?from=&to=  // CSV download
```

#### 3.3 Admin Reviews per Vendor
```typescript
GET /api/v1/vendors/:id/reviews  // كل reviews منتجات بائع معين
```

#### 3.4 Vendor — إحصائيات إضافية
```typescript
GET /api/v1/vendors/me/analytics/top-products
// بيرجع: اسم المنتج، عدد المبيعات، الإيراد الإجمالي، متوسط التقييم
```

---

### Phase 4 — Customer Dashboard (بعد إكمال الأولويات)

سيتم تحليله منفصلاً. الـ endpoints الموجودة للعميل:
- ✅ التسجيل والدخول
- ✅ الملف الشخصي والعناوين
- ✅ السلة والطلبات
- ✅ Wishlist
- ✅ التقييمات
- ✅ نقاط الولاء
- ✅ الاسترجاع
- ✅ المحادثات
- ❌ **تتبع الشحنة** بشكل تفصيلي (tracking page)
- ❌ **إشعارات push** (WebSocket أو FCM)
- ❌ **صفحة الفاتورة** (invoice PDF per order)

---

## 6. Endpoint Reference — Complete Map {#endpoint-map}

### Admin Endpoints (كل الموجود)
```
Analytics:
  GET  /api/v1/admin/analytics/overview
  GET  /api/v1/admin/analytics/revenue
  GET  /api/v1/admin/analytics/top-products
  GET  /api/v1/admin/analytics/top-vendors
  GET  /api/v1/admin/analytics/users-growth
  GET  /api/v1/admin/analytics/active-carts

Vendors:
  GET    /api/v1/vendors
  GET    /api/v1/vendors/:id
  PATCH  /api/v1/vendors/:id/approve
  PATCH  /api/v1/vendors/:id/reject
  PATCH  /api/v1/vendors/:id/suspend
  PATCH  /api/v1/vendors/:id/commission
  GET    /api/v1/vendors/:id/stats

Products:
  GET    /api/v1/products/admin/queue
  POST   /api/v1/products/admin
  PATCH  /api/v1/products/admin/:id
  PATCH  /api/v1/products/admin/bulk
  PATCH  /api/v1/products/:id/approve
  PATCH  /api/v1/products/:id/reject
  PATCH  /api/v1/products/:id/feature
  DELETE /api/v1/products/:id

Orders:
  GET    /api/v1/orders/admin
  GET    /api/v1/orders/admin/:orderNumber
  PATCH  /api/v1/orders/admin/:orderNumber/status
  GET    /api/v1/orders/admin/returns
  PATCH  /api/v1/orders/admin/returns/:id/approve
  PATCH  /api/v1/orders/admin/returns/:id/refund

Returns:
  GET    /api/v1/returns/admin
  PATCH  /api/v1/returns/admin/:id/approve
  PATCH  /api/v1/returns/admin/:id/reject

Payouts:
  GET    /api/v1/admin/payouts
  PATCH  /api/v1/admin/payouts/:id/approve
  GET    /api/v1/admin/commissions/summary

Users:
  GET    /api/v1/users
  GET    /api/v1/users/:id
  PATCH  /api/v1/users/:id/status
  PATCH  /api/v1/users/bulk/status

Reviews:
  GET    /api/v1/reviews
  PATCH  /api/v1/reviews/:id/approve
  PATCH  /api/v1/reviews/:id/reject

Loyalty:
  PATCH  /api/v1/loyalty/settings
  GET    /api/v1/loyalty/admin/users/:userId
  POST   /api/v1/loyalty/admin/users/:userId/adjust

Settings:
  GET/POST/PATCH/DELETE /api/v1/vendor-plans
  GET                   /api/v1/vendor-plans/admin/all
  GET/POST/PATCH/DELETE /api/v1/shipping/zones
  GET/POST/PATCH/DELETE /api/v1/shipping/methods
  GET                   /api/v1/shipping/shipments
  GET/POST/PATCH/DELETE /api/v1/attributes
  GET/POST/PATCH/DELETE /api/v1/categories
  POST                  /api/v1/notifications/broadcast
  GET/POST/DELETE       /api/v1/media
```

### Vendor Endpoints (كل الموجود)
```
Profile:
  GET    /api/v1/vendors/me
  PATCH  /api/v1/vendors/me
  GET    /api/v1/vendors/me/stats
  GET    /api/v1/vendors/me/earnings
  GET    /api/v1/vendors/me/payouts

Products:
  GET    /api/v1/products/vendor/me
  POST   /api/v1/products
  PATCH  /api/v1/products/:id
  PATCH  /api/v1/products/:id/status
  DELETE /api/v1/products/:id
  PUT    /api/v1/products/:id/images
  PATCH  /api/v1/products/bulk
  POST   /api/v1/products/:id/variants
  PATCH  /api/v1/products/:id/variants/:variantId
  DELETE /api/v1/products/:id/variants/:variantId
  PUT    /api/v1/attributes/product/:productId

Orders:
  GET    /api/v1/orders/vendor/items
  PATCH  /api/v1/orders/vendor/items/:itemId/status

Shipping:
  POST   /api/v1/shipping/shipments
  PATCH  /api/v1/shipping/shipments/:id
  GET    /api/v1/shipping/shipments/order/:orderNumber

Promotions:
  GET/POST/PATCH/DELETE /api/v1/promotions/vendor
  GET/POST/PATCH/DELETE /api/v1/promotions/vendor/:id

Chat:
  GET    /api/v1/conversations
  GET    /api/v1/conversations/:id/messages

Media:
  GET    /api/v1/media
  POST   /api/v1/media
  DELETE /api/v1/media/:id
```

---

## ملخص تنفيذي

| الـ Dashboard | الموجود | الناقص الحرج | الناقص متوسط |
|---|---|---|---|
| **Admin** | ~85% | Platform Settings, Vendor Analytics Detail | Analytics enhancements, Return detail |
| **Vendor** | ~70% | Vendor Analytics, Order Detail, Reviews | Chat send, CSV export |
| **Customer** | ~80% | Invoice PDF, Push notifications | Shipment tracking detail |

**أهم 5 endpoints للبدء بيها:**
1. `GET /api/v1/vendors/me/analytics/overview` — البائع لازم يشوف أرقامه
2. `GET /api/v1/orders/vendor/:orderNumber` — تفاصيل الطلب للبائع
3. `GET /api/v1/reviews/vendor/me` — تقييمات منتجات البائع
4. توسيع `GET /api/v1/admin/analytics/overview` بـ AOV + refundRate
5. `GET/PATCH /api/v1/admin/settings` — إعدادات المنصة

---

*آخر تحديث: يونيو 2026*
