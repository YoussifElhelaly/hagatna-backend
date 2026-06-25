# Hagatna Backend — Frontend Developer Guide

> **Base URL:** `https://your-domain.com/api/v1`  
> **Auth:** Bearer token in `Authorization` header  
> **Content-Type:** `application/json` (except file uploads → `multipart/form-data`)

---

## 1. Authentication

### 1.1 Register
```
POST /auth/register
{ "name": "...", "email": "...", "password": "...", "phone": "..." }
```
Returns: `{ accessToken, refreshToken, user }`

### 1.2 Login
```
POST /auth/login
{ "email": "...", "password": "..." }
```
Returns: `{ accessToken, refreshToken, user }`

### 1.3 Refresh Token
```
POST /auth/refresh
{ "refreshToken": "..." }
```
Returns: `{ accessToken, refreshToken }`

### 1.4 Logout
```
POST /auth/logout
{ "refreshToken": "..." }
```

### 1.5 Token Storage
- Store `accessToken` in **memory** (not localStorage) — expires in 15 minutes
- Store `refreshToken` in **httpOnly cookie** or secure storage
- On every 401 response → call `/auth/refresh` → retry original request

### 1.6 Google OAuth
```
GET /auth/google          → redirects to Google
GET /auth/google/callback → returns { accessToken, refreshToken, user }
```

---

## 2. User Roles

| Role | Description |
|---|---|
| `customer` | Default role. Can browse, buy, review, use loyalty points |
| `vendor` | Upgraded after admin approves onboarding application |
| `admin` | Full platform access |

Access the current user: `GET /users/me`  
The `role` field tells you which dashboard/flows to show.

---

## 3. Customer Flow

### 3.1 Browse Products
```
GET /products?page=1&limit=20&categoryId=&search=&minPrice=&maxPrice=&status=active
GET /products/:slug          → product detail
GET /products/:id/reviews    → product reviews
```

### 3.2 Categories
```
GET /categories              → tree of all categories
GET /categories/:slug        → single category with children
```

### 3.3 Cart
```
GET    /cart                 → current cart
POST   /cart/items           { productId, variantId?, quantity }
PATCH  /cart/items/:id       { quantity }
DELETE /cart/items/:id
DELETE /cart                 → clear entire cart
```

### 3.4 Place Order
```
POST /orders
{
  "addressId": "uuid",          // OR use shippingAddress below
  "shippingAddress": {           // inline address (no need to save first)
    "recipientName": "...",
    "phone": "...",
    "street": "...",
    "city": "...",
    "country": "...",
    "zipCode": "..."             // optional
  },
  "paymentMethod": "cash_on_delivery" | "card" | "bank_transfer",
  "couponCode": "SAVE10",        // optional
  "notes": "...",                // optional
  "pointsToRedeem": 200          // optional — loyalty points
}
```

> ⚠️ **Important:** If the cart has products from **multiple vendors**, the response will be an **array of orders** (one per vendor). Always handle the response as an array.

Response:
```json
[
  { "orderNumber": "HGT-20260610-A3K9F", "total": 150.00, ... },
  { "orderNumber": "HGT-20260610-B7X2Q", "total": 80.00, ... }
]
```

### 3.5 Orders
```
GET  /orders                 → list my orders (?status=pending&page=1)
GET  /orders/:orderNumber    → order detail with items + status history
DELETE /orders/:orderNumber  → cancel order (only pending/confirmed)
```

### 3.6 Loyalty Points
```
GET  /loyalty/settings               → shows earn rate, point value, min redemption
GET  /loyalty/me                     → my balance + transaction history
GET  /loyalty/preview?subtotal=200   → how many points I'll earn on this order
GET  /loyalty/preview/redeem?subtotal=200 → max points I can redeem on this order
```

Show loyalty preview on the checkout page before submitting the order.

### 3.7 Addresses
```
GET    /users/me/addresses
POST   /users/me/addresses    { recipientName, phone, street, city, country, zipCode? }
PATCH  /users/me/addresses/:id
DELETE /users/me/addresses/:id
```

### 3.8 Wishlist
```
GET    /wishlist
POST   /wishlist    { productId }
DELETE /wishlist/:productId
```

### 3.9 Reviews
```
POST   /reviews         { productId, rating: 1-5, comment }
PATCH  /reviews/:id     { rating, comment }
DELETE /reviews/:id
```

### 3.10 Returns
```
POST /orders/:orderNumber/return
{ "reason": "...", "orderItemId": "uuid", "amount": 50.00 }
```
Only allowed on `delivered` orders with `paymentStatus: completed`.

---

## 4. Vendor Flow

### 4.1 Onboarding (any logged-in user)
```
POST /vendors/onboard
{
  "storeName": "...",
  "description": { "en": "...", "ar": "..." },
  "storeSlug": "my-store",
  "phone": "+201234567890",       // required
  "secondaryPhone": "...",         // optional
  "taxCardNumber": "...",          // required
  "commercialRegistrationNumber": "...", // required
  "planId": "uuid",               // required — pick from GET /vendor-plans
  "address": "...",
  "city": "...",
  "country": "..."
}
```
Status becomes `pending` until admin approves. User role stays `customer` until approval.

### 4.2 Check Application Status
```
GET /vendors/me
```
Check `status` field: `pending` | `approved` | `rejected` | `suspended`

### 4.3 Product Management
```
GET    /products/vendor/my           → my products
POST   /products                     → create product
PATCH  /products/:id                 → update product
DELETE /products/:id                 → soft delete
PATCH  /products/bulk                → bulk update (price/stock/status for multiple products)
```

Create product body:
```json
{
  "name": { "en": "...", "ar": "..." },
  "description": { "en": "...", "ar": "..." },
  "price": 99.99,
  "comparePrice": 129.99,
  "stockQuantity": 100,
  "categoryId": "uuid",
  "tags": ["tag1", "tag2"],
  "status": "draft" | "pending_approval"
}
```

Bulk update:
```
PATCH /products/bulk
{ "ids": ["uuid1", "uuid2"], "update": { "price": 50, "status": "archived" } }
```

### 4.4 Order Items (Vendor's view)
```
GET   /orders/vendor/items           → all order items for my store (?status=pending)
PATCH /orders/vendor/items/:itemId/status
      { "status": "confirmed" | "processing" | "shipped" }
```

### 4.5 Vendor Earnings & Payouts
```
GET /vendors/me/earnings
```
Returns:
```json
{
  "totalOrders": 42,
  "totalGross": 15000.00,      // total customer paid
  "totalCommission": 1500.00,  // platform fee deducted
  "totalNet": 13500.00,        // vendor's total
  "totalPaid": 10000.00,       // already received
  "totalPending": 3500.00      // waiting for payout
}
```

```
GET /vendors/me/payouts?status=pending&page=1&limit=20
```
Returns paginated list of commission records. Each record has:
- `netAmount` — how much vendor receives for that item
- `status` — `pending` or `completed`
- `paidAt` — when it was paid
- `paymentProof` — URL of payment screenshot (uploaded by admin)

### 4.6 Vendor Stats
```
GET /vendors/me/stats
```

---

## 5. Admin Flow

### 5.1 Vendor Management
```
GET   /vendors                    → list all vendors (?status=pending)
GET   /vendors/:id
PATCH /vendors/:id/approve
PATCH /vendors/:id/reject         { "rejectionReason": "..." }
PATCH /vendors/:id/suspend
PATCH /vendors/:id/commission     { "commissionRate": 10 }
GET   /vendors/:id/stats
```

### 5.2 Product Management
```
GET   /products/admin             → all products across vendors
PATCH /products/admin/:id         → edit any product (including isFeatured)
PATCH /products/admin/bulk        → bulk update any products
```

### 5.3 Order Management
```
GET   /orders/admin               → all orders (?status&paymentStatus&search&from&to)
GET   /orders/admin/:orderNumber  → full order detail
PATCH /orders/admin/:orderNumber/status   { "status": "...", "note": "..." }
```

### 5.4 Payouts / Commissions
```
GET   /admin/payouts?status=pending&vendorId=uuid
PATCH /admin/payouts/:id/approve          → multipart/form-data with optional "image" field
GET   /admin/commissions/summary?vendorId=uuid
```

To approve a payout with proof:
```js
const form = new FormData();
form.append('image', file);  // payment screenshot
fetch('/api/v1/admin/payouts/:id/approve', {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
  body: form
});
```

### 5.5 Analytics
```
GET /admin/analytics/overview          → KPIs (revenue, orders, users, platform income)
GET /admin/analytics/revenue?from=&to= → daily revenue chart
GET /admin/analytics/top-products
GET /admin/analytics/top-vendors
GET /admin/analytics/users/growth
GET /admin/analytics/active-carts      → users with non-empty carts
```

Overview response:
```json
{
  "totalRevenue": 500000,        // total customer payments (GMV)
  "totalPlatformIncome": 50000,  // platform's commission income
  "totalOrders": 1200,
  "pendingOrders": 45,
  "totalUsers": 3400,
  "totalVendors": 87,
  "totalProducts": 620,
  "totalReviews": 890
}
```

### 5.6 Loyalty Settings
```
GET   /loyalty/settings
PATCH /loyalty/settings
{
  "isEnabled": true,
  "earnRatePercent": 5,     // 5% of order total = points earned
  "pointValue": 0.50,       // 1 point = 0.50 EGP
  "minRedemptionPoints": 100,
  "maxRedemptionPercent": 50  // max 50% of order can be paid with points
}
```

### 5.7 Promotions / Coupons
```
GET    /promotions
POST   /promotions   { name, code, discountType: "percentage"|"fixed", discountValue, ... }
PATCH  /promotions/:id
DELETE /promotions/:id
```

### 5.8 Categories
```
GET    /categories
POST   /categories   { name: { en, ar }, slug, parentId? }
PATCH  /categories/:id
DELETE /categories/:id
```

### 5.9 Vendor Plans
```
GET    /vendor-plans
POST   /vendor-plans   { name: { en, ar }, maxProducts, price, categories: [categoryId] }
PATCH  /vendor-plans/:id
DELETE /vendor-plans/:id
```

### 5.10 Returns (Refunds)
```
GET   /orders/admin/returns            → all return requests
PATCH /orders/admin/returns/:id/approve
PATCH /orders/admin/returns/:id/refund
```

### 5.11 Loyalty Admin
```
GET  /loyalty/admin/users/:userId         → user's loyalty account
POST /loyalty/admin/users/:userId/adjust  { "points": 100, "description": "..." }
```

---

## 6. File Uploads

All uploads use `multipart/form-data`.

```
POST /upload/image?folder=products       → single image, field name: "image"
POST /upload/images?folder=products      → multiple images, field name: "images"
DELETE /upload   { "publicId": "...", "resourceType": "image" }
```

Available folders: `avatars`, `products`, `vendors/logos`, `vendors/banners`, `categories`, `reviews`, `documents`

---

## 7. Notifications

```
GET   /notifications          → my notifications (?isRead=false)
PATCH /notifications/:id/read
PATCH /notifications/read-all
```

---

## 8. Chat

```
GET  /conversations           → my conversations
POST /conversations           { vendorId }  or  { customerId } (for vendor)
GET  /conversations/:id/messages
POST /conversations/:id/messages   { content }
```

---

## 9. Payments

```
POST /payments/:orderId/initiate    → start payment session
POST /payments/webhook              → Stripe/payment gateway webhook (backend only)
GET  /payments/:orderId             → payment status
```

---

## 10. Error Handling

All errors follow this format:
```json
{
  "success": false,
  "message": "Human readable error",
  "errors": [...]   // validation errors (optional)
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Not authenticated — refresh token or redirect to login |
| 403 | Forbidden — user doesn't have permission |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email, already cancelled) |
| 422 | Unprocessable entity |
| 500 | Server error |

---

## 11. Pagination

All list endpoints return:
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
