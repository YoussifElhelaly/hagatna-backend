# Hagatna — Full Workflow Documentation | توثيق سير العمل الكامل

---

## WORKFLOW 1: User Registration & Email Verification
## سير العمل 1: تسجيل مستخدم جديد والتحقق من البريد الإلكتروني

### Preconditions | الشروط المسبقة
- User does not have an existing account with the same email.

### Steps | الخطوات

1. User sends `POST /auth/register` with name, email, password, (optional phone).
2. System validates input (unique email, password strength).
3. System hashes password (bcrypt, 12 rounds) and creates user record (`isVerified: false`, `role: customer`).
4. System generates 6-digit OTP, stores in Redis with 10-minute TTL (`otp:{email}`).
5. System sends OTP email (non-blocking — email failure never crashes registration).
6. System returns 201 with user data (no tokens yet).
7. User submits `POST /auth/verify-email` with email + OTP.
8. System validates OTP from Redis (not expired, matches).
9. System marks user `isVerified: true`, deletes OTP from Redis.
10. User can now log in.

### Scenarios | السيناريوهات

| Scenario | What Happens |
|----------|-------------|
| Email already registered | 409 Conflict |
| Weak password | 400 with field errors |
| OTP expired (>10 min) | 400 "OTP expired" |
| OTP wrong | 400 "Invalid OTP" |
| User resends OTP | New OTP overwrites old in Redis |
| User tries to re-register with same email | 409 Conflict |

---

## WORKFLOW 2: Login & Token Management
## سير العمل 2: تسجيل الدخول وإدارة الرموز

### Steps

1. User sends `POST /auth/login` with email + password.
2. System finds user by email.
3. System compares password with bcrypt hash.
4. If account `isActive: false` → 403 Forbidden.
5. System generates: Access Token (JWT, 15 min) + Refresh Token (JWT, 7 days).
6. System hashes refresh token (SHA-256), stores in `user.refreshToken` in DB.
7. Returns both tokens + user object.
8. Frontend stores tokens, attaches `Authorization: Bearer <accessToken>` on every request.

### Token Refresh Flow

1. Access token expires (15 min).
2. Frontend sends `POST /auth/refresh` with refresh token.
3. System verifies JWT signature + checks hash against DB.
4. If valid: issues new access token + new refresh token (rotation).
5. Old refresh token invalidated in DB.
6. If refresh token invalid/expired → 401 → user must log in again.

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Wrong email or password | 401 (same message — no enumeration) |
| Account suspended | 403 Forbidden |
| Account not verified | 401 "Please verify your email" |
| Refresh token reused after rotation | 401 (token no longer in DB) |
| Logout | Refresh token cleared from DB |
| Password reset | All sessions invalidated (refreshToken cleared) |

---

## WORKFLOW 3: Google/Facebook OAuth
## سير العمل 3: تسجيل الدخول بـ Google / Facebook

### Steps

1. Frontend redirects user to `GET /auth/google` (or `/auth/facebook`).
2. User approves OAuth consent.
3. Provider returns profile (email, name, profile picture, provider ID).
4. System checks: **Does user exist with this email?**
   - **Yes, same provider ID** → log in directly.
   - **Yes, different provider** → link social ID to existing account, log in.
   - **No** → create new account (`isVerified: true`, no password), log in.
5. System issues access + refresh tokens.
6. Redirects to frontend with tokens in query params.

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| User previously registered with email | Social ID linked to existing account |
| New user via OAuth | Account created, role: customer |
| OAuth provider returns no email | Registration fails gracefully |

---

## WORKFLOW 4: Vendor Onboarding
## سير العمل 4: تأهيل البائع

### Preconditions
- User must be registered and email-verified.

### Steps

1. User sends `POST /vendors/onboard` with store details.
2. **Check: Does vendor profile exist?**
   - **No** → Create new `VendorProfile` with `status: pending`.
   - **Yes, status: approved** → 409 "Already approved".
   - **Yes, status: pending** → 409 "Application under review".
   - **Yes, status: rejected** → Update existing record, reset to `pending`.
3. System generates unique slug from English store name.
4. Admin receives notification (system) about new application.
5. Admin reviews via `GET /vendors?status=pending`.
6. **Admin approves** (`PATCH /vendors/:id/approve`):
   - Transaction: `VendorProfile.status → approved`, `User.role → vendor`, `verifiedAt = now`.
   - Notification fired: "Your store has been approved".
7. **Admin rejects** (`PATCH /vendors/:id/reject`):
   - `VendorProfile.status → rejected`, `rejectionReason` stored.
   - Vendor can re-apply.

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| First application | New profile, status: pending |
| Re-application after rejection | Updates existing record, resets to pending |
| Re-application while pending | 409 Conflict |
| Admin approves | User role upgraded to vendor, notification sent |
| Admin rejects | Rejection reason stored, can re-apply |
| Admin suspends | Vendor deactivated, user isActive: false, sessions cleared |

---

## WORKFLOW 5: Product Lifecycle
## سير العمل 5: دورة حياة المنتج

### Steps

1. Vendor creates product (`POST /products`) → `status: draft`.
2. Vendor adds images (`PUT /products/:id/images`).
3. Vendor adds variants (`POST /products/:id/variants`) if needed.
4. Vendor activates product (`PATCH /products/:id/status` → `active`).
5. Product appears in public listing and search.
6. Admin can feature/unfeature (`PATCH /products/:id/feature`).
7. Vendor can archive (`PATCH /products/:id/status` → `archived`).

### Status Transitions

```
draft → active → archived
draft → archived
active → draft
active → archived
archived → draft (re-list)
archived → active (re-activate)
```

### Cache Behavior

- Product detail cached for 15 min (`cache:product:{slug}`)
- Featured products cached for 10 min (`cache:products:featured`)
- Any mutation invalidates the relevant cache keys

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Vendor deactivated | Products still visible but marked inactive |
| Product archived | Disappears from public listing |
| Admin toggles featured | Featured cache invalidated immediately |
| English name updated | Slug regenerated, old slug cache deleted |
| Category deleted with products | Blocked — must reassign products first |

---

## WORKFLOW 6: Cart Management
## سير العمل 6: إدارة سلة التسوق

### Steps

1. User hits `GET /cart` → cart auto-created if first time.
2. User adds item (`POST /cart/items`).
3. System validates: product active, vendor approved, sufficient stock.
4. `priceSnapshot` locked at current price.
5. If item already in cart → quantity incremented (no duplicate row).
6. User updates quantity (`PATCH /cart/items/:id`).
7. `quantity: 0` → item removed automatically.
8. User proceeds to checkout.

### Business Rules

- `priceSnapshot`: Price captured at add-time. Protects against price changes during shopping.
- Stock check: `existingCartQty + newQty ≤ availableStock`
- Cart persists across sessions (DB-stored, not session/cookie based)

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Product goes out of stock while in cart | No immediate error — caught at checkout |
| Product archived while in cart | Blocked at checkout with clear message |
| Vendor suspended while item in cart | Blocked at checkout with clear message |
| Quantity exceeds stock | 400 "Only X units available" |
| Add same item twice | Quantity incremented, price snapshot refreshed |
| Cart empty at checkout | 400 "Your cart is empty" |

---

## WORKFLOW 7: Order Placement
## سير العمل 7: تقديم طلب

### Preconditions
- User authenticated, cart not empty.

### Steps

1. User sends `POST /orders` with address + payment method + optional coupon.
2. System resolves shipping address (saved address by ID or inline).
3. System re-validates every cart item (active, vendor approved, stock available).
4. System validates coupon if provided:
   - Active, within date range, usage limits not exceeded, min purchase met.
   - Per-user limit checked.
5. System computes totals: `subtotal → discount → tax (0) → shipping (0) → total`.
6. **Single transaction:**
   a. Generate unique order number (HGT-YYYYMMDD-XXXXX).
   b. Create `Order` record.
   c. For each cart item: create `OrderItem` with `productSnapshot` (locked at purchase time).
   d. For each item: create `VendorCommission` (gross × rate = commission, net = gross - commission).
   e. Create initial `OrderStatusHistory` (pending → pending).
   f. Decrement stock (variant or product level).
   g. Record `CouponUsage` + increment promo `usageCount`.
   h. Clear cart.
7. Fire notification: "Order placed successfully".
8. Return full order detail.

### ProductSnapshot (Locked at Purchase)

```json
{
  "id": "uuid",
  "name": { "en": "iPhone 15 Pro", "ar": "آيفون 15 برو" },
  "slug": "iphone-15-pro",
  "image": "https://cdn.example.com/img.jpg",
  "vendorStoreName": { "en": "TechZone" },
  "variantName": "256GB - Black",
  "variantOptions": { "storage": "256GB", "color": "Black" }
}
```

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Cart item out of stock at checkout | 400 with specific product name |
| Invalid coupon | 400 with reason |
| Coupon below min purchase | 400 with required amount |
| Coupon per-user limit reached | 400 "Already used maximum times" |
| Address not found | 404 "Address not found" |
| Order placed successfully | Cart cleared, stock decremented, commissions recorded |

---

## WORKFLOW 8: Order Lifecycle (Status Flow)
## سير العمل 8: دورة حياة الطلب

### Order Status Machine

```
Customer places order     → pending
Admin confirms            → confirmed
Vendor starts preparing   → processing  (via item status)
Vendor ships              → shipped     (via item status)
Admin marks delivered     → delivered
Customer cancels          → cancelled   (from pending or confirmed only)
Admin processes refund    → refunded
```

### Per-Item Status (Vendor manages their own items)

```
pending → confirmed (vendor confirms receipt of order)
confirmed → processing (vendor starts fulfillment)
processing → shipped (vendor ships with tracking)
shipped → delivered (admin or auto)
any → cancelled (admin only)
```

### Commission Flow

| Event | Action |
|-------|--------|
| Order placed | Commission record created with `status: pending` |
| Payment confirmed | Commission `status: completed`, `paidAt` set |
| Refund | Commission `status: refunded` |

### Customer Cancellation Rules

- Cancellable only from `pending` or `confirmed`
- On cancel: stock restored for all items in one transaction
- `OrderStatusHistory` entry created with "Cancelled by customer"

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Cancel after shipping | 409 "Cannot cancel — already shipped" |
| Cancel after delivery | 409 "Cannot cancel — already delivered" |
| Admin skips status | 409 "Invalid status transition" |
| Vendor tries to mark delivered | 403 (admin-only status) |

---

## WORKFLOW 9: Shipping & Tracking
## سير العمل 9: الشحن والتتبع

### Steps

1. Customer checks available methods (`GET /shipping/methods/available?country=AE&orderSubtotal=500`).
2. System returns applicable methods with effective price (free if threshold met).
3. After order placed, vendor creates shipment (`POST /shipping/shipments`):
   - Links to order, selects shipping method, adds carrier + tracking.
4. Vendor updates shipment status as it progresses.
5. Customer can view shipment via `GET /shipping/shipments/order/:orderNumber`.

### Shipment Status Flow

```
preparing → shipped → in_transit → out_for_delivery → delivered
any state → failed
failed → preparing  (retry)
```

### Free Shipping Logic

```
isFree: true          → always free
minOrderForFree: 200  → free if subtotal ≥ 200, otherwise charged
neither               → always charged
```

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Vendor creates duplicate shipment | 409 "Shipment already exists" |
| Wrong vendor creates shipment | 403 "No items from your store" |
| Transition to invalid status | 409 "Invalid transition" |
| Transition to shipped | shippedAt timestamp set automatically |
| Transition to delivered | deliveredAt timestamp set automatically |

---

## WORKFLOW 10: Review System
## سير العمل 10: نظام التقييمات

### Preconditions
- User must be authenticated.
- One review per user per product per order.

### Steps

1. Customer submits review (`POST /reviews`) with rating + optional title/content/media.
2. If `orderId` provided: system verifies purchase → `isVerifiedPurchase: true`.
3. Review created with `status: pending`.
4. Admin lists pending reviews (`GET /reviews?status=pending`).
5. Admin approves → review public. Customer notified.
6. Admin rejects → review hidden. Customer can edit and resubmit.
7. Other users mark review helpful (`POST /reviews/:id/helpful`).

### Rating Stats (Computed on Every Fetch)

```
averageRating = sum(rating × count) / totalApprovedReviews
distribution  = { 1: N, 2: N, 3: N, 4: N, 5: N }
```

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Review without order | Accepted, isVerifiedPurchase: false |
| Review with invalid orderId | 400 "Order does not contain this product" |
| Duplicate review same product + order | 409 Conflict |
| Customer edits approved review | Status reset to pending for re-moderation |
| Customer edits rejected review | 409 "Cannot edit rejected reviews" |
| Product deleted | Reviews cascade-deleted |

---

## WORKFLOW 11: Coupon & Discount System
## سير العمل 11: نظام الكوبونات والخصومات

### Coupon Validation Chain (in order)

1. Code exists and `isActive: true`?
2. Current date within `startsAt` and `endsAt`?
3. `usageCount < usageLimitTotal` (if limit set)?
4. `subtotal ≥ minPurchaseAmount`?
5. User's usage count < `usageLimitPerUser`?
6. Compute discount amount.

### Discount Calculation

```
percentage discount:
  amount = (discountValue / 100) × subtotal
  if maxDiscountAmount: amount = min(amount, maxDiscountAmount)

fixed discount:
  amount = min(discountValue, subtotal)  // cannot exceed cart total
```

### Who Can Create

| Creator | Scope | Platform-Wide |
|---------|-------|---------------|
| Admin | All promotions | Yes (`vendorId: null`) |
| Vendor | Own store only | No (forced `vendorId`) |

### Delete Behavior

- `usageCount = 0` → Hard delete
- `usageCount > 0` → Soft deactivate (preserves order history)

### Scenarios

| Scenario | What Happens |
|----------|-------------|
| Code not found | 400 "Invalid or expired coupon" |
| Before startsAt | 400 "Not yet active" |
| After endsAt | 400 "Coupon has expired" |
| Total limit reached | 400 "Usage limit reached" |
| Per-user limit reached | 400 "Already used maximum times" |
| Below min purchase | 400 "Minimum purchase required: X" |
| Valid coupon | Discount applied, CouponUsage recorded, usageCount incremented |

---

## WORKFLOW 12: Notification System
## سير العمل 12: نظام الإشعارات

### Automatic Triggers (Internal)

| Event | Service | Notification |
|-------|---------|-------------|
| Order placed | `orders.service` | Customer: "Order placed" |
| Order status changed | `orders.service` | Customer: "Order updated" |
| Vendor approved | `vendors.service` | Vendor owner: "Store approved" |
| Review approved | Manual admin action | Customer: "Review approved" |
| New chat message | `chat.service` | Recipient: "New message" |

### Key Design Principles

1. **Never blocking**: `createNotification()` is wrapped in try/catch — failure never crashes business operations.
2. **Fire-and-forget**: Notification calls return immediately; DB write happens asynchronously.
3. **Bilingual always**: Every notification has both `title.en` + `title.ar` + `body.en` + `body.ar`.

### Frontend Integration

```
// Poll unread count for header badge
GET /notifications/unread-count  (every 30s or on focus)

// On notification bell click
GET /notifications?isRead=false&limit=10

// On read
PATCH /notifications/:id/read
// or
PATCH /notifications/read-all
```

### Admin Broadcast

- With `userIds`: sends to specific users (max useful: ~1000)
- Without `userIds`: sends to ALL active users (batched 500/chunk)
- Use case: promotional announcements, system maintenance notices

---

## WORKFLOW 13: Error Handling Global Flow
## سير العمل 13: معالجة الأخطاء العالمية

### Error Processing Pipeline

```
Request arrives
  → Validation (Zod) fails → 400 with field errors array
  → Authentication fails → 401
  → Authorization fails → 403
  → Business logic throws ApiError → correct status code
  → Prisma P2002 (unique constraint) → 409
  → Prisma P2025 (not found) → 404
  → Unknown error → 500 (stack trace hidden in production)
```

### Rate Limiting

| Endpoint Group | Limit |
|---------------|-------|
| Global (all routes) | 100 req / 15 min per IP |
| Auth (login/register/forgot) | 10 req / 15 min per IP |
| OTP resend | 3 req / hour per IP |

---

*Workflow Documentation for Hagatna Multi-Vendor E-Commerce Platform v1.0.0*
