"use strict";
/**
 * Hagatna E-commerce — Full Workflow Seed
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates the complete platform lifecycle in proper workflow order:
 *
 *  Phase 1 — Foundation
 *    ✅ 1 Admin · 2 Vendors (approved) · 3 Customers (with addresses)
 *    ✅ 5 top-level categories + 7 sub-categories (bilingual)
 *    ✅ 6 products with variants, images, tags (bilingual, active)
 *    ✅ 3 shipping zones + 7 methods
 *    ✅ 3 promotions (2 % coupons + 1 fixed)
 *
 *  Phase 2 — Shopping
 *    ✅ Wishlists (customers saving products)
 *    ✅ Carts with items (in-progress shopping sessions)
 *
 *  Phase 3 — Orders (5 orders in different lifecycle stages)
 *    ✅ Order A — DELIVERED  (customer1 → TechZone, coupon used, reviewed, commission paid)
 *    ✅ Order B — SHIPPED    (customer2 → TechZone, in transit, commission pending)
 *    ✅ Order C — PROCESSING (customer1 → Island Fashion, fashion items)
 *    ✅ Order D — PENDING    (customer2 → TechZone, just placed, payment pending)
 *    ✅ Order E — REFUNDED   (customer3 → TechZone, delivered then returned)
 *
 *  Phase 4 — Financials
 *    ✅ Payments (completed / pending)
 *    ✅ VendorCommissions per order item
 *    ✅ Refund record (Order E return)
 *    ✅ CouponUsage (Order A)
 *
 *  Phase 5 — Social
 *    ✅ Reviews (approved, verified purchase — Orders A products)
 *    ✅ Notifications (order, shipping, review, system events)
 *    ✅ Conversations + Messages (customer ↔ vendor chat)
 *
 * Run: npm run db:seed
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const slugify_1 = __importDefault(require("slugify"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const slug = (text) => (0, slugify_1.default)(text, { lower: true, strict: true, trim: true });
const hash = (pw) => bcryptjs_1.default.hash(pw, 12);
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const dec = (n) => n; // Prisma accepts plain JS numbers for Decimal fields
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}
function hoursAgo(n) {
    const d = new Date();
    d.setHours(d.getHours() - n);
    return d;
}
// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🌱 Starting full workflow seed...\n');
    await cleanDatabase();
    // ── Phase 1: Foundation ───────────────────────────────────────────────────
    const { admin, vendors, customers } = await seedUsers();
    const categories = await seedCategories();
    const plans = await seedVendorPlans(categories);
    const { vendorProfiles } = await seedVendorProfiles(vendors, plans);
    const attrDefs = await seedAttributeDefinitions(categories);
    const products = await seedProducts(vendorProfiles, categories);
    await seedProductAttributes(products, attrDefs);
    await seedShipping();
    const promotions = await seedPromotions(vendorProfiles[0].id);
    // ── Phase 2: Shopping ─────────────────────────────────────────────────────
    await seedWishlists(customers, products);
    await seedCarts(customers, products);
    // ── Phase 3-5: Orders → Payments → Financials → Social ───────────────────
    await seedOrderWorkflows(admin, vendors, customers, vendorProfiles, products, promotions);
    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n✅ Seed completed successfully!\n');
    console.log('─────────────────────────────────────────────────────────');
    console.log('🔑 Login credentials:');
    console.log('   Admin    → admin@hagatna.com      / Admin@12345');
    console.log('   Vendor 1 → vendor1@hagatna.com    / Vendor@12345   (TechZone Guam)');
    console.log('   Vendor 2 → vendor2@hagatna.com    / Vendor@12345   (Island Fashion)');
    console.log('   Customer1→ customer1@hagatna.com  / Customer@12345');
    console.log('   Customer2→ customer2@hagatna.com  / Customer@12345');
    console.log('   Customer3→ customer3@hagatna.com  / Customer@12345');
    console.log('─────────────────────────────────────────────────────────');
    console.log('📦 Order states seeded:');
    console.log('   ORD-20260501-0001 → DELIVERED  (with review + commission paid)');
    console.log('   ORD-20260501-0002 → SHIPPED    (in transit)');
    console.log('   ORD-20260501-0003 → PROCESSING');
    console.log('   ORD-20260501-0004 → PENDING    (payment pending)');
    console.log('   ORD-20260501-0005 → REFUNDED   (delivered + returned)');
    console.log('─────────────────────────────────────────────────────────');
    console.log('🎟️  Coupons: WELCOME15 (15% off), TECH10 (10% off tech), SAVE20 ($20 off)');
    console.log('─────────────────────────────────────────────────────────');
    console.log('📋 Vendor Plans: Starter (12%), Professional (8%), Enterprise (5%)');
    console.log('🏷️  Attribute definitions seeded for Electronics & Fashion categories');
    console.log('─────────────────────────────────────────────────────────\n');
}
// ─────────────────────────────────────────────────────────────────────────────
// CLEAN
// ─────────────────────────────────────────────────────────────────────────────
async function cleanDatabase() {
    console.log('🗑️  Cleaning existing data...');
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.couponUsage.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.reviewMedia.deleteMany();
    await prisma.review.deleteMany();
    await prisma.vendorCommission.deleteMany();
    await prisma.refund.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.shipment.deleteMany(); // must be before order
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.productAttribute.deleteMany();
    await prisma.productTag.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.attributeDefinition.deleteMany();
    await prisma.vendorPlanCategory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.shippingMethod.deleteMany();
    await prisma.shippingZone.deleteMany();
    await prisma.address.deleteMany();
    await prisma.vendorProfile.deleteMany();
    await prisma.vendorPlan.deleteMany();
    await prisma.user.deleteMany();
    console.log('   ✓ Done.\n');
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — USERS
// ─────────────────────────────────────────────────────────────────────────────
async function seedUsers() {
    console.log('👤 Seeding users...');
    const admin = await prisma.user.create({
        data: {
            name: 'Hagatna Admin',
            email: 'admin@hagatna.com',
            passwordHash: await hash('Admin@12345'),
            role: client_1.Role.admin,
            isVerified: true,
            isActive: true,
        },
    });
    const [vendor1, vendor2] = await Promise.all([
        prisma.user.create({
            data: {
                name: 'Ahmad Al-Rashid',
                email: 'vendor1@hagatna.com',
                passwordHash: await hash('Vendor@12345'),
                role: client_1.Role.vendor,
                isVerified: true,
                isActive: true,
                phone: '+1-671-555-0101',
            },
        }),
        prisma.user.create({
            data: {
                name: 'Sara Al-Mansoori',
                email: 'vendor2@hagatna.com',
                passwordHash: await hash('Vendor@12345'),
                role: client_1.Role.vendor,
                isVerified: true,
                isActive: true,
                phone: '+1-671-555-0202',
            },
        }),
    ]);
    const [customer1, customer2, customer3] = await Promise.all([
        prisma.user.create({
            data: {
                name: 'Mohammed Al-Zaidi',
                email: 'customer1@hagatna.com',
                passwordHash: await hash('Customer@12345'),
                role: client_1.Role.customer,
                isVerified: true,
                isActive: true,
                phone: '+1-671-555-0301',
                addresses: {
                    create: [
                        {
                            label: 'Home',
                            recipientName: 'Mohammed Al-Zaidi',
                            phone: '+1-671-555-0301',
                            street: '123 Marine Drive',
                            city: 'Hagåtña',
                            country: 'GU',
                            zipCode: '96910',
                            isDefault: true,
                        },
                        {
                            label: 'Work',
                            recipientName: 'Mohammed Al-Zaidi',
                            phone: '+1-671-555-0301',
                            street: '456 Army Drive',
                            city: 'Hagåtña',
                            country: 'GU',
                            zipCode: '96910',
                            isDefault: false,
                        },
                    ],
                },
            },
        }),
        prisma.user.create({
            data: {
                name: 'Fatima Hassan',
                email: 'customer2@hagatna.com',
                passwordHash: await hash('Customer@12345'),
                role: client_1.Role.customer,
                isVerified: true,
                isActive: true,
                phone: '+1-671-555-0302',
                addresses: {
                    create: {
                        label: 'Home',
                        recipientName: 'Fatima Hassan',
                        phone: '+1-671-555-0302',
                        street: "456 O'Brien Drive",
                        city: 'Tamuning',
                        country: 'GU',
                        zipCode: '96913',
                        isDefault: true,
                    },
                },
            },
        }),
        prisma.user.create({
            data: {
                name: 'Khalid Al-Amri',
                email: 'customer3@hagatna.com',
                passwordHash: await hash('Customer@12345'),
                role: client_1.Role.customer,
                isVerified: true,
                isActive: true,
                phone: '+1-671-555-0303',
                addresses: {
                    create: {
                        label: 'Home',
                        recipientName: 'Khalid Al-Amri',
                        phone: '+1-671-555-0303',
                        street: '789 Route 1',
                        city: 'Dededo',
                        country: 'GU',
                        zipCode: '96929',
                        isDefault: true,
                    },
                },
            },
        }),
    ]);
    console.log(`   ✓ 6 users created (1 admin, 2 vendors, 3 customers)`);
    return { admin, vendors: [vendor1, vendor2], customers: [customer1, customer2, customer3] };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — VENDOR PLANS
// ─────────────────────────────────────────────────────────────────────────────
async function seedVendorPlans(categories) {
    console.log('📋 Seeding vendor plans...');
    // ── Starter Plan — Fashion & Home (suitable for small local stores) ──────
    const starter = await prisma.vendorPlan.create({
        data: {
            name: { en: 'Starter', ar: 'مبتدئ' },
            description: { en: 'Great for new vendors selling fashion or home products. Up to 50 products.', ar: 'مثالي للبائعين الجدد في الأزياء أو المنتجات المنزلية. حتى 50 منتجاً.' },
            defaultCommissionRate: 10.00,
            maxProducts: 50,
            isActive: true,
            sortOrder: 1,
            categories: {
                create: [
                    { categoryId: categories.fashion.id },
                    { categoryId: categories.homeAndLiving.id },
                    { categoryId: categories.beauty.id },
                ],
            },
        },
    });
    // ── Professional Plan — Electronics + Fashion + Sports ──────────────────
    const professional = await prisma.vendorPlan.create({
        data: {
            name: { en: 'Professional', ar: 'محترف' },
            description: { en: 'For established vendors. Lower commission, broader categories, up to 200 products.', ar: 'للبائعين الراسخين. عمولة أقل ونطاق أوسع من الفئات، حتى 200 منتج.' },
            defaultCommissionRate: 8.00,
            maxProducts: 200,
            isActive: true,
            sortOrder: 2,
            categories: {
                create: [
                    { categoryId: categories.electronics.id },
                    { categoryId: categories.fashion.id },
                    { categoryId: categories.sports.id },
                    { categoryId: categories.homeAndLiving.id },
                ],
            },
        },
    });
    // ── Enterprise Plan — All categories, unlimited ──────────────────────────
    const enterprise = await prisma.vendorPlan.create({
        data: {
            name: { en: 'Enterprise', ar: 'مؤسسي' },
            description: { en: 'Full platform access. All categories, unlimited products, lowest commission rate.', ar: 'وصول كامل للمنصة. جميع الفئات، منتجات غير محدودة، أقل نسبة عمولة.' },
            defaultCommissionRate: 5.00,
            maxProducts: null, // unlimited
            isActive: true,
            sortOrder: 3,
            categories: {
                create: [
                    { categoryId: categories.electronics.id },
                    { categoryId: categories.fashion.id },
                    { categoryId: categories.homeAndLiving.id },
                    { categoryId: categories.sports.id },
                    { categoryId: categories.beauty.id },
                ],
            },
        },
    });
    console.log(`   ✓ 3 vendor plans (Starter 10%, Professional 8%, Enterprise 5%)`);
    return { starter, professional, enterprise };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — ATTRIBUTE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
async function seedAttributeDefinitions(categories) {
    console.log('🏷️  Seeding attribute definitions...');
    // ── Electronics (parent) — brand & color inherited by all sub-categories ──
    const [elecBrand, elecColor] = await Promise.all([
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.electronics.id,
                key: 'brand',
                label: { en: 'Brand', ar: 'الماركة' },
                type: client_1.AttributeType.select,
                options: ['Apple', 'Samsung', 'Sony', 'Huawei', 'Xiaomi', 'LG', 'Dell', 'HP', 'Lenovo', 'Other'],
                isFilterable: true,
                isRequired: true,
                sortOrder: 1,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.electronics.id,
                key: 'color',
                label: { en: 'Color', ar: 'اللون' },
                type: client_1.AttributeType.select,
                options: ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Green', 'Red', 'Purple', 'Titanium'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 2,
            },
        }),
    ]);
    // ── Smartphones — own attributes + inherits brand & color from Electronics ──
    const [phoneStorage, phoneRam, phoneConnectivity, phoneScreenSize] = await Promise.all([
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.phones.id,
                key: 'storage',
                label: { en: 'Storage', ar: 'التخزين' },
                type: client_1.AttributeType.select,
                options: ['64GB', '128GB', '256GB', '512GB', '1TB'],
                isFilterable: true,
                isRequired: true,
                sortOrder: 3,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.phones.id,
                key: 'ram',
                label: { en: 'RAM', ar: 'الذاكرة العشوائية' },
                type: client_1.AttributeType.select,
                options: ['4GB', '6GB', '8GB', '12GB', '16GB'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 4,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.phones.id,
                key: 'connectivity',
                label: { en: 'Connectivity', ar: 'الاتصال' },
                type: client_1.AttributeType.select,
                options: ['4G', '5G'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 5,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.phones.id,
                key: 'screen_size',
                label: { en: 'Screen Size (inches)', ar: 'حجم الشاشة (بوصة)' },
                type: client_1.AttributeType.range,
                isFilterable: true,
                isRequired: false,
                sortOrder: 6,
            },
        }),
    ]);
    // ── Laptops & Computers ──────────────────────────────────────────────────
    const [laptopRam, laptopStorage, laptopChip, laptopDisplay] = await Promise.all([
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.laptops.id,
                key: 'ram',
                label: { en: 'RAM', ar: 'الذاكرة العشوائية' },
                type: client_1.AttributeType.select,
                options: ['8GB', '16GB', '18GB', '24GB', '32GB', '36GB', '64GB'],
                isFilterable: true,
                isRequired: true,
                sortOrder: 3,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.laptops.id,
                key: 'storage',
                label: { en: 'Storage', ar: 'التخزين' },
                type: client_1.AttributeType.select,
                options: ['256GB', '512GB', '1TB', '2TB', '4TB'],
                isFilterable: true,
                isRequired: true,
                sortOrder: 4,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.laptops.id,
                key: 'chip',
                label: { en: 'Processor / Chip', ar: 'المعالج' },
                type: client_1.AttributeType.select,
                options: ['M3', 'M3 Pro', 'M3 Max', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 5,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.laptops.id,
                key: 'display_size',
                label: { en: 'Display Size (inches)', ar: 'حجم الشاشة (بوصة)' },
                type: client_1.AttributeType.select,
                options: ['13"', '14"', '15"', '16"', '17"'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 6,
            },
        }),
    ]);
    // ── Audio & Video ────────────────────────────────────────────────────────
    const [audioConnectivity, audioBattery, audioNoiseCanceling] = await Promise.all([
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.audioVideo.id,
                key: 'connectivity_type',
                label: { en: 'Connectivity', ar: 'نوع الاتصال' },
                type: client_1.AttributeType.select,
                options: ['Wired', 'Wireless', 'Bluetooth', 'Wired & Wireless'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 3,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.audioVideo.id,
                key: 'battery_life_hours',
                label: { en: 'Battery Life (hours)', ar: 'عمر البطارية (ساعات)' },
                type: client_1.AttributeType.range,
                isFilterable: false,
                isRequired: false,
                sortOrder: 4,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.audioVideo.id,
                key: 'noise_canceling',
                label: { en: 'Noise Canceling', ar: 'إلغاء الضوضاء' },
                type: client_1.AttributeType.boolean,
                isFilterable: true,
                isRequired: false,
                sortOrder: 5,
            },
        }),
    ]);
    // ── Fashion (parent) — size & color inherited by Men/Women/Kids ──────────
    const [fashionSize, fashionColor] = await Promise.all([
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.fashion.id,
                key: 'size',
                label: { en: 'Size', ar: 'المقاس' },
                type: client_1.AttributeType.select,
                options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
                isFilterable: true,
                isRequired: true,
                sortOrder: 1,
            },
        }),
        prisma.attributeDefinition.create({
            data: {
                categoryId: categories.fashion.id,
                key: 'color',
                label: { en: 'Color', ar: 'اللون' },
                type: client_1.AttributeType.select,
                options: ['White', 'Black', 'Navy', 'Grey', 'Beige', 'Red', 'Blue', 'Green', 'Ocean Blue', 'Hibiscus Red'],
                isFilterable: true,
                isRequired: false,
                sortOrder: 2,
            },
        }),
    ]);
    // ── Men's Fashion — material ─────────────────────────────────────────────
    const menMaterial = await prisma.attributeDefinition.create({
        data: {
            categoryId: categories.menFashion.id,
            key: 'material',
            label: { en: 'Material', ar: 'القماش' },
            type: client_1.AttributeType.select,
            options: ['Cotton', 'Linen', 'Polyester', 'Wool', 'Silk', 'Blend'],
            isFilterable: true,
            isRequired: false,
            sortOrder: 3,
        },
    });
    // ── Women's Fashion — material ───────────────────────────────────────────
    const womenMaterial = await prisma.attributeDefinition.create({
        data: {
            categoryId: categories.womenFashion.id,
            key: 'material',
            label: { en: 'Material', ar: 'القماش' },
            type: client_1.AttributeType.select,
            options: ['Cotton', 'Linen', 'Polyester', 'Chiffon', 'Silk', 'Blend'],
            isFilterable: true,
            isRequired: false,
            sortOrder: 3,
        },
    });
    console.log(`   ✓ Attribute definitions: Electronics (2), Smartphones (4), Laptops (4), Audio (3), Fashion (2), Men's (1), Women's (1)`);
    return {
        electronics: { brand: elecBrand, color: elecColor },
        phones: { storage: phoneStorage, ram: phoneRam, connectivity: phoneConnectivity, screenSize: phoneScreenSize },
        laptops: { ram: laptopRam, storage: laptopStorage, chip: laptopChip, displaySize: laptopDisplay },
        audio: { connectivityType: audioConnectivity, batteryLife: audioBattery, noiseCanceling: audioNoiseCanceling },
        fashion: { size: fashionSize, color: fashionColor },
        menFashion: { material: menMaterial },
        womenFashion: { material: womenMaterial },
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — PRODUCT ATTRIBUTES
// ─────────────────────────────────────────────────────────────────────────────
async function seedProductAttributes(products, defs) {
    console.log('🔖 Seeding product attributes...');
    await Promise.all([
        // iPhone 15 Pro — Electronics(brand, color) + Smartphones(storage, ram, connectivity, screen_size)
        prisma.productAttribute.createMany({
            data: [
                { productId: products.iphone.id, definitionId: defs.electronics.brand.id, value: 'Apple' },
                { productId: products.iphone.id, definitionId: defs.electronics.color.id, value: 'Titanium' },
                { productId: products.iphone.id, definitionId: defs.phones.storage.id, value: '256GB' },
                { productId: products.iphone.id, definitionId: defs.phones.ram.id, value: '8GB' },
                { productId: products.iphone.id, definitionId: defs.phones.connectivity.id, value: '5G' },
                { productId: products.iphone.id, definitionId: defs.phones.screenSize.id, value: '6.1' },
            ],
        }),
        // Samsung Galaxy S24 Ultra
        prisma.productAttribute.createMany({
            data: [
                { productId: products.samsung.id, definitionId: defs.electronics.brand.id, value: 'Samsung' },
                { productId: products.samsung.id, definitionId: defs.electronics.color.id, value: 'Black' },
                { productId: products.samsung.id, definitionId: defs.phones.storage.id, value: '512GB' },
                { productId: products.samsung.id, definitionId: defs.phones.ram.id, value: '12GB' },
                { productId: products.samsung.id, definitionId: defs.phones.connectivity.id, value: '5G' },
                { productId: products.samsung.id, definitionId: defs.phones.screenSize.id, value: '6.8' },
            ],
        }),
        // Sony WH-1000XM5 Headphones — Electronics(brand, color) + Audio(connectivity, battery, noise_canceling)
        prisma.productAttribute.createMany({
            data: [
                { productId: products.headphones.id, definitionId: defs.electronics.brand.id, value: 'Sony' },
                { productId: products.headphones.id, definitionId: defs.electronics.color.id, value: 'Black' },
                { productId: products.headphones.id, definitionId: defs.audio.connectivityType.id, value: 'Wireless' },
                { productId: products.headphones.id, definitionId: defs.audio.batteryLife.id, value: '30' },
                { productId: products.headphones.id, definitionId: defs.audio.noiseCanceling.id, value: 'true' },
            ],
        }),
        // MacBook Pro 14" — Electronics(brand, color) + Laptops(ram, storage, chip, display_size)
        prisma.productAttribute.createMany({
            data: [
                { productId: products.macbook.id, definitionId: defs.electronics.brand.id, value: 'Apple' },
                { productId: products.macbook.id, definitionId: defs.electronics.color.id, value: 'Silver' },
                { productId: products.macbook.id, definitionId: defs.laptops.ram.id, value: '18GB' },
                { productId: products.macbook.id, definitionId: defs.laptops.storage.id, value: '512GB' },
                { productId: products.macbook.id, definitionId: defs.laptops.chip.id, value: 'M3 Pro' },
                { productId: products.macbook.id, definitionId: defs.laptops.displaySize.id, value: '14"' },
            ],
        }),
        // Traditional Chamorro Dress — Fashion(size, color) + Women's(material)
        prisma.productAttribute.createMany({
            data: [
                { productId: products.chamorroWear.id, definitionId: defs.fashion.size.id, value: 'M' },
                { productId: products.chamorroWear.id, definitionId: defs.fashion.color.id, value: 'Ocean Blue' },
                { productId: products.chamorroWear.id, definitionId: defs.womenFashion.material.id, value: 'Cotton' },
            ],
        }),
        // Men's Kandura — Fashion(size, color) + Men's(material)
        prisma.productAttribute.createMany({
            data: [
                { productId: products.kandura.id, definitionId: defs.fashion.size.id, value: 'L' },
                { productId: products.kandura.id, definitionId: defs.fashion.color.id, value: 'White' },
                { productId: products.kandura.id, definitionId: defs.menFashion.material.id, value: 'Linen' },
            ],
        }),
    ]);
    console.log(`   ✓ Product attributes set for 6 products`);
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — VENDOR PROFILES
// ─────────────────────────────────────────────────────────────────────────────
async function seedVendorProfiles(vendors, plans) {
    console.log('🏪 Seeding vendor profiles...');
    const [techZone, islandFashion] = await Promise.all([
        prisma.vendorProfile.create({
            data: {
                userId: vendors[0].id,
                planId: plans.professional.id,
                storeName: { en: 'TechZone Guam', ar: 'تيك زون غوام' },
                description: {
                    en: 'Your premier destination for electronics and gadgets in Guam.',
                    ar: 'وجهتك الأولى للإلكترونيات والأجهزة في غوام.',
                },
                storeSlug: 'techzone-guam',
                logo: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/vendors/techzone-logo.jpg',
                banner: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/vendors/techzone-banner.jpg',
                address: '150 Pale San Vitores Road',
                city: 'Tumon',
                country: 'GU',
                commissionRate: 8.00, // admin-overridden below professional plan default (8%)
                status: client_1.VendorStatus.approved,
                verifiedAt: daysAgo(60),
            },
        }),
        prisma.vendorProfile.create({
            data: {
                userId: vendors[1].id,
                planId: plans.starter.id,
                storeName: { en: 'Island Fashion House', ar: 'بيت الأزياء الجزيري' },
                description: {
                    en: 'Celebrating Pacific and Arabic fashion. Unique clothing blending tradition with modern style.',
                    ar: 'نحتفل بالأزياء الباسيفيكية والعربية. ملابس فريدة تمزج التقاليد مع الأسلوب الحديث.',
                },
                storeSlug: 'island-fashion-house',
                logo: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/vendors/fashion-logo.jpg',
                banner: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/vendors/fashion-banner.jpg',
                address: '88 Chalan San Antonio',
                city: 'Tamuning',
                country: 'GU',
                commissionRate: 10.00, // matches starter plan default
                status: client_1.VendorStatus.approved,
                verifiedAt: daysAgo(45),
            },
        }),
    ]);
    console.log(`   ✓ 2 vendor profiles created`);
    return { vendorProfiles: [techZone, islandFashion] };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
async function seedCategories() {
    console.log('🗂️  Seeding categories...');
    const [electronics, fashion, homeAndLiving, sports, beauty] = await Promise.all([
        prisma.category.create({
            data: {
                name: { en: 'Electronics', ar: 'إلكترونيات' },
                description: { en: 'Gadgets, devices and tech accessories', ar: 'الأجهزة والمعدات والإكسسوارات التقنية' },
                slug: 'electronics',
                image: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/categories/electronics.jpg',
                sortOrder: 1, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: { en: 'Fashion', ar: 'أزياء' },
                description: { en: 'Clothing, shoes and accessories for all', ar: 'ملابس وأحذية وإكسسوارات للجميع' },
                slug: 'fashion',
                image: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/categories/fashion.jpg',
                sortOrder: 2, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: { en: 'Home & Living', ar: 'المنزل والمعيشة' },
                description: { en: 'Furniture, decor and everything for your home', ar: 'الأثاث والديكور وكل ما يخص منزلك' },
                slug: 'home-living',
                sortOrder: 3, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: { en: 'Sports & Outdoors', ar: 'الرياضة والهواء الطلق' },
                description: { en: 'Gear and equipment for active lifestyles', ar: 'معدات وأدوات للأنماط الحياتية النشطة' },
                slug: 'sports-outdoors',
                sortOrder: 4, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                name: { en: 'Beauty & Health', ar: 'الجمال والصحة' },
                description: { en: 'Skincare, cosmetics and wellness products', ar: 'العناية بالبشرة ومستحضرات التجميل' },
                slug: 'beauty-health',
                sortOrder: 5, isActive: true,
            },
        }),
    ]);
    // Sub-categories — Electronics
    const [phones, laptops, audioVideo, accessories] = await Promise.all([
        prisma.category.create({
            data: {
                parentId: electronics.id,
                name: { en: 'Smartphones', ar: 'الهواتف الذكية' },
                description: { en: 'Latest smartphones from top brands', ar: 'أحدث الهواتف الذكية من أفضل الماركات' },
                slug: 'smartphones', sortOrder: 1, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                parentId: electronics.id,
                name: { en: 'Laptops & Computers', ar: 'اللابتوبات والكمبيوترات' },
                slug: 'laptops-computers', sortOrder: 2, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                parentId: electronics.id,
                name: { en: 'Audio & Video', ar: 'الصوت والصورة' },
                slug: 'audio-video', sortOrder: 3, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                parentId: electronics.id,
                name: { en: 'Accessories', ar: 'الإكسسوارات' },
                slug: 'tech-accessories', sortOrder: 4, isActive: true,
            },
        }),
    ]);
    // Sub-categories — Fashion
    const [menFashion, womenFashion, kidsWear] = await Promise.all([
        prisma.category.create({
            data: {
                parentId: fashion.id,
                name: { en: "Men's Fashion", ar: 'أزياء الرجال' },
                slug: 'mens-fashion', sortOrder: 1, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                parentId: fashion.id,
                name: { en: "Women's Fashion", ar: 'أزياء النساء' },
                slug: 'womens-fashion', sortOrder: 2, isActive: true,
            },
        }),
        prisma.category.create({
            data: {
                parentId: fashion.id,
                name: { en: "Kids' Wear", ar: 'ملابس الأطفال' },
                slug: 'kids-wear', sortOrder: 3, isActive: true,
            },
        }),
    ]);
    console.log(`   ✓ 12 categories (5 top-level + 7 sub)`);
    return { electronics, fashion, homeAndLiving, sports, beauty, phones, laptops, audioVideo, accessories, menFashion, womenFashion, kidsWear };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
async function seedProducts(vendorProfiles, categories) {
    console.log('🛍️  Seeding products...');
    const techId = vendorProfiles[0].id;
    const fashionId = vendorProfiles[1].id;
    // ── P1: iPhone 15 Pro ───────────────────────────────────────────────────
    const iphone = await prisma.product.create({
        data: {
            vendorId: techId,
            categoryId: categories.phones.id,
            name: { en: 'iPhone 15 Pro', ar: 'آيفون 15 برو' },
            description: {
                en: 'The most advanced iPhone ever. A17 Pro chip, titanium design, 48MP camera with 5x optical zoom.',
                ar: 'أكثر هاتف آيفون تطوراً. شريحة A17 Pro وتصميم التيتانيوم وكاميرا 48 ميجابكسل بتكبير بصري 5x.',
            },
            slug: 'iphone-15-pro',
            price: dec(999.00), comparePrice: dec(1099.00),
            sku: 'APL-IP15P-001', stockQuantity: 50, lowStockThreshold: 5,
            status: client_1.ProductStatus.active, isFeatured: true,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/iphone-15-pro-1.jpg', altText: 'iPhone 15 Pro - Natural Titanium', isPrimary: true, sortOrder: 1 },
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/iphone-15-pro-2.jpg', altText: 'iPhone 15 Pro - Side View', isPrimary: false, sortOrder: 2 },
                ],
            },
            tags: { create: [{ tag: 'apple' }, { tag: 'iphone' }, { tag: 'smartphone' }, { tag: '5g' }, { tag: 'featured' }] },
            variants: {
                create: [
                    { name: '128GB - Natural Titanium', options: { storage: '128GB', color: 'Natural Titanium' }, price: dec(999.00), comparePrice: dec(1099.00), sku: 'APL-IP15P-128-NT', stockQuantity: 20, isActive: true },
                    { name: '256GB - Natural Titanium', options: { storage: '256GB', color: 'Natural Titanium' }, price: dec(1099.00), comparePrice: dec(1199.00), sku: 'APL-IP15P-256-NT', stockQuantity: 15, isActive: true },
                    { name: '256GB - Black Titanium', options: { storage: '256GB', color: 'Black Titanium' }, price: dec(1099.00), comparePrice: dec(1199.00), sku: 'APL-IP15P-256-BT', stockQuantity: 10, isActive: true },
                    { name: '512GB - White Titanium', options: { storage: '512GB', color: 'White Titanium' }, price: dec(1299.00), comparePrice: dec(1399.00), sku: 'APL-IP15P-512-WT', stockQuantity: 5, isActive: true },
                ],
            },
        },
        include: { variants: true },
    });
    // ── P2: Samsung Galaxy S24 Ultra ─────────────────────────────────────────
    const samsung = await prisma.product.create({
        data: {
            vendorId: techId,
            categoryId: categories.phones.id,
            name: { en: 'Samsung Galaxy S24 Ultra', ar: 'سامسونج غالاكسي S24 الترا' },
            description: {
                en: 'Built-in S Pen, 200MP camera, and Galaxy AI features. The most powerful Samsung smartphone.',
                ar: 'قلم S Pen المدمج وكاميرا 200 ميجابكسل وميزات Galaxy AI. أقوى هاتف سامسونج.',
            },
            slug: 'samsung-galaxy-s24-ultra',
            price: dec(1199.00), comparePrice: dec(1299.00),
            sku: 'SAM-S24U-001', stockQuantity: 35, lowStockThreshold: 5,
            status: client_1.ProductStatus.active, isFeatured: true,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/s24-ultra-1.jpg', altText: 'Samsung Galaxy S24 Ultra - Titanium Black', isPrimary: true, sortOrder: 1 },
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/s24-ultra-2.jpg', altText: 'Samsung Galaxy S24 Ultra - S Pen', isPrimary: false, sortOrder: 2 },
                ],
            },
            tags: { create: [{ tag: 'samsung' }, { tag: 'android' }, { tag: 'smartphone' }, { tag: 's-pen' }] },
            variants: {
                create: [
                    { name: '256GB - Titanium Black', options: { storage: '256GB', color: 'Titanium Black' }, price: dec(1199.00), sku: 'SAM-S24U-256-TB', stockQuantity: 15, isActive: true },
                    { name: '512GB - Titanium Gray', options: { storage: '512GB', color: 'Titanium Gray' }, price: dec(1359.00), sku: 'SAM-S24U-512-TG', stockQuantity: 12, isActive: true },
                    { name: '1TB  - Titanium Violet', options: { storage: '1TB', color: 'Titanium Violet' }, price: dec(1619.00), sku: 'SAM-S24U-1TB-TV', stockQuantity: 8, isActive: true },
                ],
            },
        },
        include: { variants: true },
    });
    // ── P3: Sony WH-1000XM5 ──────────────────────────────────────────────────
    const headphones = await prisma.product.create({
        data: {
            vendorId: techId,
            categoryId: categories.audioVideo.id,
            name: { en: 'Sony WH-1000XM5 Headphones', ar: 'سماعات سوني WH-1000XM5' },
            description: {
                en: 'Industry-leading noise canceling, 30-hour battery, crystal-clear hands-free calling.',
                ar: 'إلغاء الضوضاء الرائد في الصناعة وبطارية 30 ساعة ومكالمات هاتفية بوضوح كريستالي.',
            },
            slug: 'sony-wh-1000xm5',
            price: dec(349.00), comparePrice: dec(399.00),
            sku: 'SNY-WH1K-XM5', stockQuantity: 30, lowStockThreshold: 5,
            status: client_1.ProductStatus.active, isFeatured: false,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/xm5-black.jpg', altText: 'Sony WH-1000XM5 - Black', isPrimary: true, sortOrder: 1 },
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/xm5-silver.jpg', altText: 'Sony WH-1000XM5 - Silver', isPrimary: false, sortOrder: 2 },
                ],
            },
            tags: { create: [{ tag: 'sony' }, { tag: 'headphones' }, { tag: 'noise-canceling' }, { tag: 'wireless' }] },
            variants: {
                create: [
                    { name: 'Black', options: { color: 'Black' }, price: dec(349.00), sku: 'SNY-WH1K-XM5-BLK', stockQuantity: 18, isActive: true },
                    { name: 'Silver', options: { color: 'Silver' }, price: dec(349.00), sku: 'SNY-WH1K-XM5-SLV', stockQuantity: 12, isActive: true },
                ],
            },
        },
        include: { variants: true },
    });
    // ── P4: MacBook Pro 14" ──────────────────────────────────────────────────
    const macbook = await prisma.product.create({
        data: {
            vendorId: techId,
            categoryId: categories.laptops.id,
            name: { en: 'MacBook Pro 14"', ar: 'ماك بوك برو 14 إنش' },
            description: {
                en: 'M3 Pro or M3 Max chip. Liquid Retina XDR display. Up to 22 hours battery.',
                ar: 'شريحة M3 Pro أو M3 Max. شاشة Liquid Retina XDR. حتى 22 ساعة بطارية.',
            },
            slug: 'macbook-pro-14',
            price: dec(1999.00), comparePrice: dec(2099.00),
            sku: 'APL-MBP14-001', stockQuantity: 20, lowStockThreshold: 3,
            status: client_1.ProductStatus.active, isFeatured: true,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/mbp14-1.jpg', altText: 'MacBook Pro 14" - Space Black', isPrimary: true, sortOrder: 1 },
                ],
            },
            tags: { create: [{ tag: 'apple' }, { tag: 'macbook' }, { tag: 'laptop' }, { tag: 'm3' }] },
            variants: {
                create: [
                    { name: 'M3 Pro 18GB 512GB Space Black', options: { chip: 'M3 Pro', ram: '18GB', storage: '512GB', color: 'Space Black' }, price: dec(1999.00), sku: 'APL-MBP14-M3P-18-512-SB', stockQuantity: 8, isActive: true },
                    { name: 'M3 Pro 18GB 1TB Silver', options: { chip: 'M3 Pro', ram: '18GB', storage: '1TB', color: 'Silver' }, price: dec(2199.00), sku: 'APL-MBP14-M3P-18-1TB-SL', stockQuantity: 7, isActive: true },
                    { name: 'M3 Max 36GB 1TB Space Black', options: { chip: 'M3 Max', ram: '36GB', storage: '1TB', color: 'Space Black' }, price: dec(3199.00), sku: 'APL-MBP14-M3X-36-1TB-SB', stockQuantity: 5, isActive: true },
                ],
            },
        },
        include: { variants: true },
    });
    // ── P5: Traditional Chamorro Dress ───────────────────────────────────────
    const chamorroWear = await prisma.product.create({
        data: {
            vendorId: fashionId,
            categoryId: categories.womenFashion.id,
            name: { en: 'Traditional Chamorro Dress', ar: 'الفستان الشامورو التقليدي' },
            description: {
                en: 'Handcrafted Chamorro traditional dress in premium local fabrics with Pacific patterns. Perfect for festivals.',
                ar: 'فستان شامورو تقليدي مصنوع يدوياً من أقمشة محلية فاخرة بأنماط باسيفيكية. مثالي للمهرجانات.',
            },
            slug: 'traditional-chamorro-dress',
            price: dec(189.00), comparePrice: dec(220.00),
            sku: 'ISL-CHAM-DRESS-001', stockQuantity: 25, lowStockThreshold: 3,
            status: client_1.ProductStatus.active, isFeatured: true,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/chamorro-dress-1.jpg', altText: 'Chamorro Dress - Ocean Blue', isPrimary: true, sortOrder: 1 },
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/chamorro-dress-2.jpg', altText: 'Chamorro Dress - Hibiscus Red', isPrimary: false, sortOrder: 2 },
                ],
            },
            tags: { create: [{ tag: 'chamorro' }, { tag: 'traditional' }, { tag: 'handmade' }, { tag: 'cultural' }] },
            variants: {
                create: [
                    { name: 'S - Ocean Blue', options: { size: 'S', color: 'Ocean Blue' }, price: dec(189.00), sku: 'ISL-CHAM-S-BLU', stockQuantity: 6, isActive: true },
                    { name: 'M - Ocean Blue', options: { size: 'M', color: 'Ocean Blue' }, price: dec(189.00), sku: 'ISL-CHAM-M-BLU', stockQuantity: 8, isActive: true },
                    { name: 'L - Ocean Blue', options: { size: 'L', color: 'Ocean Blue' }, price: dec(189.00), sku: 'ISL-CHAM-L-BLU', stockQuantity: 5, isActive: true },
                    { name: 'S - Hibiscus Red', options: { size: 'S', color: 'Hibiscus Red' }, price: dec(189.00), sku: 'ISL-CHAM-S-RED', stockQuantity: 3, isActive: true },
                    { name: 'M - Hibiscus Red', options: { size: 'M', color: 'Hibiscus Red' }, price: dec(189.00), sku: 'ISL-CHAM-M-RED', stockQuantity: 3, isActive: true },
                ],
            },
        },
        include: { variants: true },
    });
    // ── P6: Men's Linen Kandura ──────────────────────────────────────────────
    const kandura = await prisma.product.create({
        data: {
            vendorId: fashionId,
            categoryId: categories.menFashion.id,
            name: { en: "Men's Premium Linen Kandura", ar: 'كندورة كتان فاخرة للرجال' },
            description: {
                en: 'Elegant linen kandura for tropical climates. Fine embroidery on collar and cuffs. Formal or everyday.',
                ar: 'كندورة كتان أنيقة للمناخات الاستوائية. تطريز دقيق على الياقة والأكمام. للمناسبات والارتداء اليومي.',
            },
            slug: 'mens-premium-linen-kandura',
            price: dec(149.00), comparePrice: dec(179.00),
            sku: 'ISL-KAND-MEN-001', stockQuantity: 40, lowStockThreshold: 5,
            status: client_1.ProductStatus.active, isFeatured: false,
            images: {
                create: [
                    { url: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/kandura-white.jpg', altText: "Kandura - White", isPrimary: true, sortOrder: 1 },
                ],
            },
            tags: { create: [{ tag: 'kandura' }, { tag: 'men' }, { tag: 'linen' }, { tag: 'arabic-fashion' }] },
            variants: {
                create: [
                    { name: 'S - White', options: { size: 'S', color: 'White' }, price: dec(149.00), sku: 'ISL-KAND-S-WHT', stockQuantity: 10, isActive: true },
                    { name: 'M - White', options: { size: 'M', color: 'White' }, price: dec(149.00), sku: 'ISL-KAND-M-WHT', stockQuantity: 12, isActive: true },
                    { name: 'L - White', options: { size: 'L', color: 'White' }, price: dec(149.00), sku: 'ISL-KAND-L-WHT', stockQuantity: 10, isActive: true },
                    { name: 'XL - White', options: { size: 'XL', color: 'White' }, price: dec(149.00), sku: 'ISL-KAND-XL-WHT', stockQuantity: 8, isActive: true },
                ],
            },
        },
        include: { variants: true },
    });
    // ── P7: Draft product (pending approval) ─────────────────────────────────
    await prisma.product.create({
        data: {
            vendorId: techId,
            categoryId: categories.accessories.id,
            name: { en: 'MagSafe Charger Bundle', ar: 'حزمة شاحن MagSafe' },
            description: { en: 'Wireless charging bundle for iPhone 15 series.', ar: 'حزمة شحن لاسلكي لسلسلة آيفون 15.' },
            slug: 'magsafe-charger-bundle',
            price: dec(59.99),
            sku: 'APL-MAGSAFE-BND', stockQuantity: 100,
            status: client_1.ProductStatus.pending_approval,
            isFeatured: false,
        },
    });
    console.log(`   ✓ 7 products (6 active + 1 pending approval)`);
    return { iphone, samsung, headphones, macbook, chamorroWear, kandura };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — SHIPPING
// ─────────────────────────────────────────────────────────────────────────────
async function seedShipping() {
    console.log('🚚 Seeding shipping...');
    const [localZone, usaZone, intlZone] = await Promise.all([
        prisma.shippingZone.create({ data: { name: 'Guam Local', countries: ['GU'], isActive: true } }),
        prisma.shippingZone.create({ data: { name: 'United States', countries: ['US'], isActive: true } }),
        prisma.shippingZone.create({ data: { name: 'International', countries: ['AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'JP', 'AU', 'GB'], isActive: true } }),
    ]);
    await Promise.all([
        prisma.shippingMethod.create({ data: { zoneId: localZone.id, name: { en: 'Same-Day Delivery', ar: 'توصيل في نفس اليوم' }, minDays: 0, maxDays: 1, price: dec(9.99), isFree: false, isActive: true } }),
        prisma.shippingMethod.create({ data: { zoneId: localZone.id, name: { en: 'Standard Local Delivery', ar: 'التوصيل المحلي العادي' }, minDays: 1, maxDays: 3, price: dec(4.99), isFree: false, minOrderForFree: dec(75.00), isActive: true } }),
        prisma.shippingMethod.create({ data: { zoneId: localZone.id, name: { en: 'Store Pickup', ar: 'الاستلام من المتجر' }, minDays: 0, maxDays: 0, price: dec(0.00), isFree: true, isActive: true } }),
        prisma.shippingMethod.create({ data: { zoneId: usaZone.id, name: { en: 'USPS Priority Mail', ar: 'البريد الأولوي USPS' }, minDays: 2, maxDays: 5, price: dec(19.99), isFree: false, minOrderForFree: dec(150.00), isActive: true } }),
        prisma.shippingMethod.create({ data: { zoneId: usaZone.id, name: { en: 'FedEx Express', ar: 'فيدإكس إكسبريس' }, minDays: 1, maxDays: 3, price: dec(34.99), isFree: false, isActive: true } }),
        prisma.shippingMethod.create({ data: { zoneId: intlZone.id, name: { en: 'International Standard', ar: 'الشحن الدولي العادي' }, minDays: 7, maxDays: 14, price: dec(29.99), isFree: false, isActive: true } }),
        prisma.shippingMethod.create({ data: { zoneId: intlZone.id, name: { en: 'International Express', ar: 'الشحن الدولي السريع' }, minDays: 3, maxDays: 7, price: dec(59.99), isFree: false, isActive: true } }),
    ]);
    console.log(`   ✓ 3 shipping zones + 7 methods`);
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — PROMOTIONS
// ─────────────────────────────────────────────────────────────────────────────
async function seedPromotions(techVendorId) {
    console.log('🎁 Seeding promotions...');
    const [welcome, tech10, save20] = await Promise.all([
        prisma.promotion.create({
            data: {
                vendorId: null,
                name: { en: 'Welcome to Hagatna!', ar: 'مرحباً بك في هاجاتنا!' },
                type: client_1.PromotionType.coupon,
                code: 'WELCOME15',
                discountType: client_1.DiscountType.percentage,
                discountValue: dec(15.00),
                minPurchaseAmount: dec(50.00),
                maxDiscountAmount: dec(50.00),
                usageLimitTotal: 1000, usageLimitPerUser: 1,
                startsAt: daysAgo(30),
                endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                isActive: true,
            },
        }),
        prisma.promotion.create({
            data: {
                vendorId: techVendorId,
                name: { en: 'TechZone Summer Sale', ar: 'تخفيضات صيف تيك زون' },
                type: client_1.PromotionType.coupon,
                code: 'TECH10',
                discountType: client_1.DiscountType.percentage,
                discountValue: dec(10.00),
                minPurchaseAmount: dec(100.00),
                maxDiscountAmount: dec(100.00),
                usageLimitTotal: 500, usageLimitPerUser: 2,
                startsAt: daysAgo(15),
                endsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                isActive: true,
            },
        }),
        prisma.promotion.create({
            data: {
                vendorId: null,
                name: { en: '$20 Off Orders Over $200', ar: 'خصم 20 دولاراً على الطلبات فوق 200 دولار' },
                type: client_1.PromotionType.coupon,
                code: 'SAVE20',
                discountType: client_1.DiscountType.fixed,
                discountValue: dec(20.00),
                minPurchaseAmount: dec(200.00),
                usageLimitTotal: 300, usageLimitPerUser: 1,
                startsAt: daysAgo(10),
                endsAt: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
                isActive: true,
            },
        }),
    ]);
    console.log(`   ✓ 3 promotions (WELCOME15, TECH10, SAVE20)`);
    return { welcome, tech10, save20 };
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — WISHLISTS
// ─────────────────────────────────────────────────────────────────────────────
async function seedWishlists(customers, products) {
    console.log('❤️  Seeding wishlists...');
    await Promise.all([
        // Customer2 saved iPhone and Chamorro dress
        prisma.wishlist.create({ data: { userId: customers[1].id, productId: products.iphone.id } }),
        prisma.wishlist.create({ data: { userId: customers[1].id, productId: products.chamorroWear.id } }),
        // Customer3 saved MacBook and Samsung
        prisma.wishlist.create({ data: { userId: customers[2].id, productId: products.macbook.id } }),
        prisma.wishlist.create({ data: { userId: customers[2].id, productId: products.samsung.id } }),
        // Customer1 saved headphones
        prisma.wishlist.create({ data: { userId: customers[0].id, productId: products.headphones.id } }),
    ]);
    console.log(`   ✓ 5 wishlist items`);
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — CARTS (active sessions)
// ─────────────────────────────────────────────────────────────────────────────
async function seedCarts(customers, products) {
    console.log('🛒 Seeding carts...');
    // Customer2 has items in cart (browsing Samsung + headphones)
    const samsungVariant = products.samsung.variants.find(v => v.sku === 'SAM-S24U-256-TB');
    const xm5BlackVariant = products.headphones.variants.find(v => v.sku === 'SNY-WH1K-XM5-BLK');
    await prisma.cart.create({
        data: {
            userId: customers[1].id,
            items: {
                create: [
                    {
                        productId: products.samsung.id,
                        variantId: samsungVariant.id,
                        quantity: 1,
                        priceSnapshot: dec(1199.00),
                    },
                    {
                        productId: products.headphones.id,
                        variantId: xm5BlackVariant.id,
                        quantity: 1,
                        priceSnapshot: dec(349.00),
                    },
                ],
            },
        },
    });
    // Customer3 has MacBook in cart
    const macM3MaxVariant = products.macbook.variants.find(v => v.sku === 'APL-MBP14-M3X-36-1TB-SB');
    await prisma.cart.create({
        data: {
            userId: customers[2].id,
            items: {
                create: [
                    {
                        productId: products.macbook.id,
                        variantId: macM3MaxVariant.id,
                        quantity: 1,
                        priceSnapshot: dec(3199.00),
                    },
                ],
            },
        },
    });
    console.log(`   ✓ 2 active carts with items`);
}
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3-5 — FULL ORDER WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────
async function seedOrderWorkflows(admin, vendors, customers, vendorProfiles, products, promotions) {
    console.log('📦 Seeding orders + payments + shipping + reviews + chat...');
    const techVendor = vendorProfiles[0];
    const fashionVendor = vendorProfiles[1];
    const c1 = customers[0]; // Mohammed
    const c2 = customers[1]; // Fatima
    const c3 = customers[2]; // Khalid
    const shippingAddr1 = {
        recipientName: 'Mohammed Al-Zaidi',
        phone: '+1-671-555-0301',
        street: '123 Marine Drive',
        city: 'Hagåtña',
        country: 'GU',
        zipCode: '96910',
    };
    const shippingAddr2 = {
        recipientName: 'Fatima Hassan',
        phone: '+1-671-555-0302',
        street: "456 O'Brien Drive",
        city: 'Tamuning',
        country: 'GU',
        zipCode: '96913',
    };
    const shippingAddr3 = {
        recipientName: 'Khalid Al-Amri',
        phone: '+1-671-555-0303',
        street: '789 Route 1',
        city: 'Dededo',
        country: 'GU',
        zipCode: '96929',
    };
    // ─────────────────────────────────────────────────────────────────────────
    // ORDER A — DELIVERED (customer1 → TechZone)
    // iPhone 15 Pro 256GB Black + MacBook Pro M3 Pro 512GB
    // WELCOME15 coupon: 15% off min($3,098, $50) = $50 discount
    // Status flow: pending → confirmed → processing → shipped → delivered
    // ─────────────────────────────────────────────────────────────────────────
    const iphoneV_256BT = products.iphone.variants.find(v => v.sku === 'APL-IP15P-256-BT');
    const macV_512SB = products.macbook.variants.find(v => v.sku === 'APL-MBP14-M3P-18-512-SB');
    const orderA_subtotal = 1099.00 + 1999.00; // 3098
    const orderA_discount = 50.00; // WELCOME15 cap
    const orderA_total = orderA_subtotal - orderA_discount;
    const orderA = await prisma.order.create({
        data: {
            userId: c1.id,
            orderNumber: 'ORD-20260501-0001',
            status: client_1.OrderStatus.delivered,
            subtotal: dec(orderA_subtotal),
            taxAmount: dec(0),
            shippingFee: dec(0), // free (order > $75)
            discountAmount: dec(orderA_discount),
            total: dec(orderA_total),
            shippingAddress: shippingAddr1,
            paymentMethod: client_1.PaymentMethod.online,
            paymentStatus: client_1.PaymentStatus.completed,
            notes: 'Please leave at the door',
            createdAt: daysAgo(15),
            updatedAt: daysAgo(10),
        },
    });
    // Order A items
    const itemA1 = await prisma.orderItem.create({
        data: {
            orderId: orderA.id,
            productId: products.iphone.id,
            variantId: iphoneV_256BT.id,
            vendorId: techVendor.id,
            productSnapshot: {
                name: { en: 'iPhone 15 Pro', ar: 'آيفون 15 برو' },
                variant: '256GB - Black Titanium',
                sku: 'APL-IP15P-256-BT',
                image: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/iphone-15-pro-1.jpg',
            },
            quantity: 1,
            unitPrice: dec(1099.00),
            subtotal: dec(1099.00),
            status: client_1.OrderStatus.delivered,
        },
    });
    const itemA2 = await prisma.orderItem.create({
        data: {
            orderId: orderA.id,
            productId: products.macbook.id,
            variantId: macV_512SB.id,
            vendorId: techVendor.id,
            productSnapshot: {
                name: { en: 'MacBook Pro 14"', ar: 'ماك بوك برو 14 إنش' },
                variant: 'M3 Pro 18GB 512GB Space Black',
                sku: 'APL-MBP14-M3P-18-512-SB',
                image: 'https://res.cloudinary.com/demo/image/upload/v1/hagatna/products/mbp14-1.jpg',
            },
            quantity: 1,
            unitPrice: dec(1999.00),
            subtotal: dec(1999.00),
            status: client_1.OrderStatus.delivered,
        },
    });
    // Order A — Status history (full lifecycle)
    await prisma.orderStatusHistory.createMany({
        data: [
            { orderId: orderA.id, previousStatus: client_1.OrderStatus.pending, newStatus: client_1.OrderStatus.confirmed, note: 'Order confirmed by vendor', changedById: vendors[0].id, createdAt: daysAgo(15) },
            { orderId: orderA.id, previousStatus: client_1.OrderStatus.confirmed, newStatus: client_1.OrderStatus.processing, note: 'Items picked and packed', changedById: vendors[0].id, createdAt: daysAgo(14) },
            { orderId: orderA.id, previousStatus: client_1.OrderStatus.processing, newStatus: client_1.OrderStatus.shipped, note: 'Shipped via FedEx Express', changedById: vendors[0].id, createdAt: daysAgo(13) },
            { orderId: orderA.id, previousStatus: client_1.OrderStatus.shipped, newStatus: client_1.OrderStatus.delivered, note: 'Delivered to customer successfully', changedById: admin.id, createdAt: daysAgo(10) },
        ],
    });
    // Order A — Payment (completed)
    const paymentA = await prisma.payment.create({
        data: {
            orderId: orderA.id,
            amount: dec(orderA_total),
            currency: 'USD',
            method: client_1.PaymentMethod.online,
            status: client_1.PaymentStatus.completed,
            transactionId: 'TXN-20260501-001-STRIPE',
            gatewayReference: 'pi_3OaXXXXXXXXXXXX',
            gatewayResponse: { status: 'succeeded', brand: 'visa', last4: '4242' },
            paidAt: daysAgo(15),
            createdAt: daysAgo(15),
        },
    });
    // Order A — Coupon usage (WELCOME15)
    await prisma.couponUsage.create({
        data: {
            promotionId: promotions.welcome.id,
            userId: c1.id,
            orderId: orderA.id,
            discountApplied: dec(orderA_discount),
        },
    });
    await prisma.promotion.update({
        where: { id: promotions.welcome.id },
        data: { usageCount: { increment: 1 } },
    });
    // Order A — Shipment (delivered)
    const shipmentZone = await prisma.shippingZone.findFirst({ where: { name: 'Guam Local' } });
    const shipmentMethod = await prisma.shippingMethod.findFirst({ where: { zoneId: shipmentZone?.id, isFree: false, minDays: 1 } });
    await prisma.shipment.create({
        data: {
            orderId: orderA.id,
            vendorId: techVendor.id,
            shippingMethodId: shipmentMethod?.id,
            carrier: 'FedEx',
            trackingNumber: 'FX-7741234560-GU',
            trackingUrl: 'https://www.fedex.com/track?id=FX-7741234560-GU',
            status: client_1.ShipmentStatus.delivered,
            shippedAt: daysAgo(13),
            estimatedDelivery: daysAgo(11),
            deliveredAt: daysAgo(10),
            createdAt: daysAgo(13),
        },
    });
    // Order A — Commissions (8% TechZone, status=completed since payout approved)
    const commA1_gross = 1099.00;
    const commA1_comm = parseFloat((commA1_gross * 0.08).toFixed(2)); // 87.92
    const commA1_net = parseFloat((commA1_gross - commA1_comm).toFixed(2));
    const commA2_gross = 1999.00;
    const commA2_comm = parseFloat((commA2_gross * 0.08).toFixed(2)); // 159.92
    const commA2_net = parseFloat((commA2_gross - commA2_comm).toFixed(2));
    await prisma.vendorCommission.createMany({
        data: [
            {
                vendorId: techVendor.id, orderId: orderA.id, orderItemId: itemA1.id,
                grossAmount: dec(commA1_gross), commissionRate: dec(8.00),
                commissionAmount: dec(commA1_comm), netAmount: dec(commA1_net),
                status: client_1.PaymentStatus.completed, paidAt: daysAgo(5),
                createdAt: daysAgo(10),
            },
            {
                vendorId: techVendor.id, orderId: orderA.id, orderItemId: itemA2.id,
                grossAmount: dec(commA2_gross), commissionRate: dec(8.00),
                commissionAmount: dec(commA2_comm), netAmount: dec(commA2_net),
                status: client_1.PaymentStatus.completed, paidAt: daysAgo(5),
                createdAt: daysAgo(10),
            },
        ],
    });
    // Order A — Reviews (approved, verified purchase)
    await prisma.review.create({
        data: {
            userId: c1.id,
            productId: products.iphone.id,
            vendorId: techVendor.id,
            orderId: orderA.id,
            rating: 5,
            title: 'Absolutely love it!',
            content: 'The iPhone 15 Pro is incredible. The camera quality blew me away, and the titanium build feels premium. TechZone Guam had it delivered within a day. Highly recommend!',
            status: client_1.ReviewStatus.approved,
            isVerifiedPurchase: true,
            helpfulCount: 12,
            createdAt: daysAgo(8),
        },
    });
    await prisma.review.create({
        data: {
            userId: c1.id,
            productId: products.macbook.id,
            vendorId: techVendor.id,
            orderId: orderA.id,
            rating: 5,
            title: 'Best laptop I have ever owned',
            content: 'The M3 Pro MacBook Pro is a beast. Runs everything flawlessly, the screen is gorgeous, and battery lasts all day. Fast delivery from TechZone. Worth every dollar.',
            status: client_1.ReviewStatus.approved,
            isVerifiedPurchase: true,
            helpfulCount: 8,
            createdAt: daysAgo(7),
        },
    });
    // ─────────────────────────────────────────────────────────────────────────
    // ORDER B — SHIPPED (customer2 → TechZone)
    // Samsung S24 Ultra 512GB + Sony XM5 Black
    // TECH10 coupon: 10% off capped at $100 → $170.80 → but max $100
    // Status: pending → confirmed → processing → shipped
    // ─────────────────────────────────────────────────────────────────────────
    const samsungV_512TG = products.samsung.variants.find(v => v.sku === 'SAM-S24U-512-TG');
    const xm5V_black = products.headphones.variants.find(v => v.sku === 'SNY-WH1K-XM5-BLK');
    const orderB_subtotal = 1359.00 + 349.00; // 1708
    const orderB_discount = 100.00; // TECH10 cap
    const orderB_total = orderB_subtotal - orderB_discount;
    const orderB = await prisma.order.create({
        data: {
            userId: c2.id,
            orderNumber: 'ORD-20260501-0002',
            status: client_1.OrderStatus.shipped,
            subtotal: dec(orderB_subtotal),
            taxAmount: dec(0),
            shippingFee: dec(0),
            discountAmount: dec(orderB_discount),
            total: dec(orderB_total),
            shippingAddress: shippingAddr2,
            paymentMethod: client_1.PaymentMethod.online,
            paymentStatus: client_1.PaymentStatus.completed,
            createdAt: daysAgo(5),
            updatedAt: daysAgo(3),
        },
    });
    const itemB1 = await prisma.orderItem.create({
        data: {
            orderId: orderB.id,
            productId: products.samsung.id,
            variantId: samsungV_512TG.id,
            vendorId: techVendor.id,
            productSnapshot: {
                name: { en: 'Samsung Galaxy S24 Ultra', ar: 'سامسونج غالاكسي S24 الترا' },
                variant: '512GB - Titanium Gray',
                sku: 'SAM-S24U-512-TG',
            },
            quantity: 1, unitPrice: dec(1359.00), subtotal: dec(1359.00),
            status: client_1.OrderStatus.shipped,
        },
    });
    const itemB2 = await prisma.orderItem.create({
        data: {
            orderId: orderB.id,
            productId: products.headphones.id,
            variantId: xm5V_black.id,
            vendorId: techVendor.id,
            productSnapshot: {
                name: { en: 'Sony WH-1000XM5 Headphones', ar: 'سماعات سوني WH-1000XM5' },
                variant: 'Black',
                sku: 'SNY-WH1K-XM5-BLK',
            },
            quantity: 1, unitPrice: dec(349.00), subtotal: dec(349.00),
            status: client_1.OrderStatus.shipped,
        },
    });
    await prisma.orderStatusHistory.createMany({
        data: [
            { orderId: orderB.id, previousStatus: client_1.OrderStatus.pending, newStatus: client_1.OrderStatus.confirmed, note: 'Order confirmed', changedById: vendors[0].id, createdAt: daysAgo(5) },
            { orderId: orderB.id, previousStatus: client_1.OrderStatus.confirmed, newStatus: client_1.OrderStatus.processing, note: 'Packing items', changedById: vendors[0].id, createdAt: daysAgo(4) },
            { orderId: orderB.id, previousStatus: client_1.OrderStatus.processing, newStatus: client_1.OrderStatus.shipped, note: 'Handed to FedEx', changedById: vendors[0].id, createdAt: daysAgo(3) },
        ],
    });
    await prisma.payment.create({
        data: {
            orderId: orderB.id,
            amount: dec(orderB_total),
            currency: 'USD',
            method: client_1.PaymentMethod.online,
            status: client_1.PaymentStatus.completed,
            transactionId: 'TXN-20260501-002-STRIPE',
            gatewayReference: 'pi_3ObYYYYYYYYYYYY',
            gatewayResponse: { status: 'succeeded', brand: 'mastercard', last4: '5555' },
            paidAt: daysAgo(5),
            createdAt: daysAgo(5),
        },
    });
    await prisma.couponUsage.create({
        data: {
            promotionId: promotions.tech10.id,
            userId: c2.id,
            orderId: orderB.id,
            discountApplied: dec(orderB_discount),
        },
    });
    await prisma.promotion.update({
        where: { id: promotions.tech10.id },
        data: { usageCount: { increment: 1 } },
    });
    // Shipment B — in transit
    await prisma.shipment.create({
        data: {
            orderId: orderB.id,
            vendorId: techVendor.id,
            carrier: 'FedEx',
            trackingNumber: 'FX-9921234561-GU',
            trackingUrl: 'https://www.fedex.com/track?id=FX-9921234561-GU',
            status: client_1.ShipmentStatus.in_transit,
            shippedAt: daysAgo(3),
            estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            createdAt: daysAgo(3),
        },
    });
    // Commissions B — pending
    const commB1_gross = 1359.00;
    const commB1_comm = parseFloat((commB1_gross * 0.08).toFixed(2));
    const commB1_net = parseFloat((commB1_gross - commB1_comm).toFixed(2));
    const commB2_gross = 349.00;
    const commB2_comm = parseFloat((commB2_gross * 0.08).toFixed(2));
    const commB2_net = parseFloat((commB2_gross - commB2_comm).toFixed(2));
    await prisma.vendorCommission.createMany({
        data: [
            { vendorId: techVendor.id, orderId: orderB.id, orderItemId: itemB1.id, grossAmount: dec(commB1_gross), commissionRate: dec(8.00), commissionAmount: dec(commB1_comm), netAmount: dec(commB1_net), status: client_1.PaymentStatus.pending, createdAt: daysAgo(3) },
            { vendorId: techVendor.id, orderId: orderB.id, orderItemId: itemB2.id, grossAmount: dec(commB2_gross), commissionRate: dec(8.00), commissionAmount: dec(commB2_comm), netAmount: dec(commB2_net), status: client_1.PaymentStatus.pending, createdAt: daysAgo(3) },
        ],
    });
    // ─────────────────────────────────────────────────────────────────────────
    // ORDER C — PROCESSING (customer1 → Island Fashion)
    // Chamorro Dress M Blue + Kandura L White
    // Status: pending → confirmed → processing
    // ─────────────────────────────────────────────────────────────────────────
    const chamorroV_M_BLU = products.chamorroWear.variants.find(v => v.sku === 'ISL-CHAM-M-BLU');
    const kanduraV_L_WHT = products.kandura.variants.find(v => v.sku === 'ISL-KAND-L-WHT');
    const orderC_subtotal = 189.00 + 149.00; // 338
    const orderC = await prisma.order.create({
        data: {
            userId: c1.id,
            orderNumber: 'ORD-20260501-0003',
            status: client_1.OrderStatus.processing,
            subtotal: dec(orderC_subtotal),
            taxAmount: dec(0),
            shippingFee: dec(4.99),
            discountAmount: dec(0),
            total: dec(orderC_subtotal + 4.99),
            shippingAddress: shippingAddr1,
            paymentMethod: client_1.PaymentMethod.bank_transfer,
            paymentStatus: client_1.PaymentStatus.completed,
            createdAt: daysAgo(2),
            updatedAt: daysAgo(1),
        },
    });
    const itemC1 = await prisma.orderItem.create({
        data: {
            orderId: orderC.id,
            productId: products.chamorroWear.id,
            variantId: chamorroV_M_BLU.id,
            vendorId: fashionVendor.id,
            productSnapshot: {
                name: { en: 'Traditional Chamorro Dress', ar: 'الفستان الشامورو التقليدي' },
                variant: 'M - Ocean Blue',
                sku: 'ISL-CHAM-M-BLU',
            },
            quantity: 1, unitPrice: dec(189.00), subtotal: dec(189.00),
            status: client_1.OrderStatus.processing,
        },
    });
    const itemC2 = await prisma.orderItem.create({
        data: {
            orderId: orderC.id,
            productId: products.kandura.id,
            variantId: kanduraV_L_WHT.id,
            vendorId: fashionVendor.id,
            productSnapshot: {
                name: { en: "Men's Premium Linen Kandura", ar: 'كندورة كتان فاخرة للرجال' },
                variant: 'L - White',
                sku: 'ISL-KAND-L-WHT',
            },
            quantity: 1, unitPrice: dec(149.00), subtotal: dec(149.00),
            status: client_1.OrderStatus.processing,
        },
    });
    await prisma.orderStatusHistory.createMany({
        data: [
            { orderId: orderC.id, previousStatus: client_1.OrderStatus.pending, newStatus: client_1.OrderStatus.confirmed, note: 'Payment received', changedById: vendors[1].id, createdAt: daysAgo(2) },
            { orderId: orderC.id, previousStatus: client_1.OrderStatus.confirmed, newStatus: client_1.OrderStatus.processing, note: 'Preparing your items', changedById: vendors[1].id, createdAt: daysAgo(1) },
        ],
    });
    await prisma.payment.create({
        data: {
            orderId: orderC.id,
            amount: dec(orderC_subtotal + 4.99),
            currency: 'USD',
            method: client_1.PaymentMethod.bank_transfer,
            status: client_1.PaymentStatus.completed,
            transactionId: 'BANK-20260501-003-GUAMB',
            paidAt: daysAgo(2),
            createdAt: daysAgo(2),
        },
    });
    // Commissions C — pending (fashion = 10%)
    const commC1_gross = 189.00;
    const commC1_comm = parseFloat((commC1_gross * 0.10).toFixed(2));
    const commC1_net = parseFloat((commC1_gross - commC1_comm).toFixed(2));
    const commC2_gross = 149.00;
    const commC2_comm = parseFloat((commC2_gross * 0.10).toFixed(2));
    const commC2_net = parseFloat((commC2_gross - commC2_comm).toFixed(2));
    await prisma.vendorCommission.createMany({
        data: [
            { vendorId: fashionVendor.id, orderId: orderC.id, orderItemId: itemC1.id, grossAmount: dec(commC1_gross), commissionRate: dec(10.00), commissionAmount: dec(commC1_comm), netAmount: dec(commC1_net), status: client_1.PaymentStatus.pending, createdAt: daysAgo(1) },
            { vendorId: fashionVendor.id, orderId: orderC.id, orderItemId: itemC2.id, grossAmount: dec(commC2_gross), commissionRate: dec(10.00), commissionAmount: dec(commC2_comm), netAmount: dec(commC2_net), status: client_1.PaymentStatus.pending, createdAt: daysAgo(1) },
        ],
    });
    // ─────────────────────────────────────────────────────────────────────────
    // ORDER D — PENDING (customer2 → TechZone, COD)
    // iPhone 15 Pro 128GB Natural Titanium
    // Payment still pending (COD)
    // ─────────────────────────────────────────────────────────────────────────
    const iphoneV_128NT = products.iphone.variants.find(v => v.sku === 'APL-IP15P-128-NT');
    const orderD = await prisma.order.create({
        data: {
            userId: c2.id,
            orderNumber: 'ORD-20260501-0004',
            status: client_1.OrderStatus.pending,
            subtotal: dec(999.00),
            taxAmount: dec(0),
            shippingFee: dec(0),
            discountAmount: dec(0),
            total: dec(999.00),
            shippingAddress: shippingAddr2,
            paymentMethod: client_1.PaymentMethod.cod,
            paymentStatus: client_1.PaymentStatus.pending,
            createdAt: hoursAgo(3),
            updatedAt: hoursAgo(3),
        },
    });
    const itemD1 = await prisma.orderItem.create({
        data: {
            orderId: orderD.id,
            productId: products.iphone.id,
            variantId: iphoneV_128NT.id,
            vendorId: techVendor.id,
            productSnapshot: {
                name: { en: 'iPhone 15 Pro', ar: 'آيفون 15 برو' },
                variant: '128GB - Natural Titanium',
                sku: 'APL-IP15P-128-NT',
            },
            quantity: 1, unitPrice: dec(999.00), subtotal: dec(999.00),
            status: client_1.OrderStatus.pending,
        },
    });
    // COD payment record (pending)
    await prisma.payment.create({
        data: {
            orderId: orderD.id,
            amount: dec(999.00),
            currency: 'USD',
            method: client_1.PaymentMethod.cod,
            status: client_1.PaymentStatus.pending,
            createdAt: hoursAgo(3),
        },
    });
    // ─────────────────────────────────────────────────────────────────────────
    // ORDER E — REFUNDED (customer3 → TechZone)
    // MacBook Pro M3 Max — delivered then returned
    // Status: pending → confirmed → processing → shipped → delivered → refunded
    // ─────────────────────────────────────────────────────────────────────────
    const macV_M3Max = products.macbook.variants.find(v => v.sku === 'APL-MBP14-M3X-36-1TB-SB');
    const orderE = await prisma.order.create({
        data: {
            userId: c3.id,
            orderNumber: 'ORD-20260501-0005',
            status: client_1.OrderStatus.refunded,
            subtotal: dec(3199.00),
            taxAmount: dec(0),
            shippingFee: dec(0),
            discountAmount: dec(0),
            total: dec(3199.00),
            shippingAddress: shippingAddr3,
            paymentMethod: client_1.PaymentMethod.online,
            paymentStatus: client_1.PaymentStatus.refunded,
            notes: 'Return requested: received wrong item configuration',
            createdAt: daysAgo(20),
            updatedAt: daysAgo(3),
        },
    });
    const itemE1 = await prisma.orderItem.create({
        data: {
            orderId: orderE.id,
            productId: products.macbook.id,
            variantId: macV_M3Max.id,
            vendorId: techVendor.id,
            productSnapshot: {
                name: { en: 'MacBook Pro 14"', ar: 'ماك بوك برو 14 إنش' },
                variant: 'M3 Max 36GB 1TB Space Black',
                sku: 'APL-MBP14-M3X-36-1TB-SB',
            },
            quantity: 1, unitPrice: dec(3199.00), subtotal: dec(3199.00),
            status: client_1.OrderStatus.refunded,
        },
    });
    await prisma.orderStatusHistory.createMany({
        data: [
            { orderId: orderE.id, previousStatus: client_1.OrderStatus.pending, newStatus: client_1.OrderStatus.confirmed, note: 'Order confirmed', changedById: vendors[0].id, createdAt: daysAgo(20) },
            { orderId: orderE.id, previousStatus: client_1.OrderStatus.confirmed, newStatus: client_1.OrderStatus.processing, note: 'Items prepared', changedById: vendors[0].id, createdAt: daysAgo(19) },
            { orderId: orderE.id, previousStatus: client_1.OrderStatus.processing, newStatus: client_1.OrderStatus.shipped, note: 'Shipped via FedEx', changedById: vendors[0].id, createdAt: daysAgo(18) },
            { orderId: orderE.id, previousStatus: client_1.OrderStatus.shipped, newStatus: client_1.OrderStatus.delivered, note: 'Delivered', changedById: admin.id, createdAt: daysAgo(15) },
            { orderId: orderE.id, previousStatus: client_1.OrderStatus.delivered, newStatus: client_1.OrderStatus.refunded, note: 'Return approved — refund issued to customer', changedById: admin.id, createdAt: daysAgo(3) },
        ],
    });
    const paymentE = await prisma.payment.create({
        data: {
            orderId: orderE.id,
            amount: dec(3199.00),
            currency: 'USD',
            method: client_1.PaymentMethod.online,
            status: client_1.PaymentStatus.refunded,
            transactionId: 'TXN-20260501-005-STRIPE',
            gatewayReference: 'pi_3OcZZZZZZZZZZZZ',
            gatewayResponse: { status: 'refunded', brand: 'visa', last4: '1111' },
            paidAt: daysAgo(20),
            createdAt: daysAgo(20),
        },
    });
    // Shipment E — delivered
    await prisma.shipment.create({
        data: {
            orderId: orderE.id,
            vendorId: techVendor.id,
            carrier: 'FedEx',
            trackingNumber: 'FX-5551234562-GU',
            trackingUrl: 'https://www.fedex.com/track?id=FX-5551234562-GU',
            status: client_1.ShipmentStatus.delivered,
            shippedAt: daysAgo(18),
            estimatedDelivery: daysAgo(16),
            deliveredAt: daysAgo(15),
            createdAt: daysAgo(18),
        },
    });
    // Commission E — pending (will be cancelled/reversed in real system)
    const commE1_gross = 3199.00;
    const commE1_comm = parseFloat((commE1_gross * 0.08).toFixed(2));
    const commE1_net = parseFloat((commE1_gross - commE1_comm).toFixed(2));
    const commE = await prisma.vendorCommission.create({
        data: {
            vendorId: techVendor.id, orderId: orderE.id, orderItemId: itemE1.id,
            grossAmount: dec(commE1_gross), commissionRate: dec(8.00),
            commissionAmount: dec(commE1_comm), netAmount: dec(commE1_net),
            status: client_1.PaymentStatus.pending,
            createdAt: daysAgo(15),
        },
    });
    // Refund record (return approved, processed)
    await prisma.refund.create({
        data: {
            paymentId: paymentE.id,
            orderId: orderE.id,
            orderItemId: itemE1.id,
            amount: dec(3199.00),
            reason: 'Customer received wrong item configuration. Returning M3 Max — should have been M3 Pro.',
            status: client_1.PaymentStatus.completed,
            processedAt: daysAgo(3),
            createdAt: daysAgo(5),
        },
    });
    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    await prisma.notification.createMany({
        data: [
            // Customer1 — Order A lifecycle
            { userId: c1.id, type: client_1.NotificationType.order, title: { en: 'Order Placed!', ar: 'تم تقديم الطلب!' }, body: { en: 'Your order ORD-20260501-0001 has been placed successfully.', ar: 'تم تقديم طلبك ORD-20260501-0001 بنجاح.' }, data: { orderId: orderA.id }, isRead: true, createdAt: daysAgo(15) },
            { userId: c1.id, type: client_1.NotificationType.order, title: { en: 'Order Confirmed', ar: 'تم تأكيد الطلب' }, body: { en: 'TechZone Guam confirmed your order.', ar: 'تيك زون غوام أكدت طلبك.' }, data: { orderId: orderA.id }, isRead: true, createdAt: daysAgo(15) },
            { userId: c1.id, type: client_1.NotificationType.order, title: { en: 'Order Shipped!', ar: 'تم شحن طلبك!' }, body: { en: 'Your order is on the way. Tracking: FX-7741234560-GU', ar: 'طلبك في الطريق. رقم التتبع: FX-7741234560-GU' }, data: { orderId: orderA.id }, isRead: true, createdAt: daysAgo(13) },
            { userId: c1.id, type: client_1.NotificationType.order, title: { en: 'Order Delivered!', ar: 'تم توصيل طلبك!' }, body: { en: 'Your order has been delivered. Enjoy your products!', ar: 'تم توصيل طلبك. استمتع بمنتجاتك!' }, data: { orderId: orderA.id }, isRead: true, createdAt: daysAgo(10) },
            { userId: c1.id, type: client_1.NotificationType.review, title: { en: 'Review Approved', ar: 'تمت الموافقة على مراجعتك' }, body: { en: 'Your review for iPhone 15 Pro has been approved.', ar: 'تمت الموافقة على مراجعتك لآيفون 15 برو.' }, data: { productId: products.iphone.id }, isRead: false, createdAt: daysAgo(7) },
            // Customer1 — Order C
            { userId: c1.id, type: client_1.NotificationType.order, title: { en: 'Order Processing', ar: 'طلبك قيد التجهيز' }, body: { en: 'Island Fashion House is preparing your order ORD-20260501-0003.', ar: 'بيت الأزياء الجزيري يجهز طلبك ORD-20260501-0003.' }, data: { orderId: orderC.id }, isRead: false, createdAt: daysAgo(1) },
            // Customer2 — Order B
            { userId: c2.id, type: client_1.NotificationType.order, title: { en: 'Order Shipped!', ar: 'تم شحن طلبك!' }, body: { en: 'Your Samsung S24 Ultra is on the way! Track: FX-9921234561-GU', ar: 'سامسونج S24 الترا في الطريق! تتبع: FX-9921234561-GU' }, data: { orderId: orderB.id }, isRead: false, createdAt: daysAgo(3) },
            // Customer3 — Order E refund
            { userId: c3.id, type: client_1.NotificationType.payment, title: { en: 'Refund Processed', ar: 'تمت معالجة الاسترداد' }, body: { en: 'Your refund of $3,199.00 for order ORD-20260501-0005 has been processed.', ar: 'تمت معالجة استرداد 3,199.00 دولار لطلبك ORD-20260501-0005.' }, data: { orderId: orderE.id }, isRead: false, createdAt: daysAgo(3) },
            // Vendor1 (TechZone) — new review alert
            { userId: vendors[0].id, type: client_1.NotificationType.review, title: { en: 'New 5★ Review!', ar: 'مراجعة 5 نجوم جديدة!' }, body: { en: 'Mohammed Al-Zaidi left a 5-star review on iPhone 15 Pro.', ar: 'محمد الزيدي ترك مراجعة 5 نجوم على آيفون 15 برو.' }, data: { productId: products.iphone.id }, isRead: false, createdAt: daysAgo(8) },
            { userId: vendors[0].id, type: client_1.NotificationType.order, title: { en: 'Return Request', ar: 'طلب إرجاع' }, body: { en: 'Khalid Al-Amri requested a return for order ORD-20260501-0005.', ar: 'خالد العامري طلب إرجاع الطلب ORD-20260501-0005.' }, data: { orderId: orderE.id }, isRead: true, createdAt: daysAgo(5) },
            // Admin — system alerts
            { userId: admin.id, type: client_1.NotificationType.system, title: { en: 'New Vendor Application', ar: 'طلب بائع جديد' }, body: { en: 'A new vendor has applied to join Hagatna platform.', ar: 'تقدم بائع جديد للانضمام إلى منصة هاجاتنا.' }, data: {}, isRead: true, createdAt: daysAgo(45) },
            { userId: admin.id, type: client_1.NotificationType.order, title: { en: 'Return Approved', ar: 'تمت الموافقة على الإرجاع' }, body: { en: 'Return for ORD-20260501-0005 approved. Refund $3,199 issued.', ar: 'تمت الموافقة على إرجاع ORD-20260501-0005. صرف استرداد 3,199 دولار.' }, data: { orderId: orderE.id }, isRead: false, createdAt: daysAgo(3) },
        ],
    });
    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATIONS + MESSAGES
    // ─────────────────────────────────────────────────────────────────────────
    // Conversation 1: Customer1 ↔ TechZone (about Order A)
    const conv1 = await prisma.conversation.create({
        data: {
            customerId: c1.id,
            vendorId: techVendor.id,
            orderId: orderA.id,
            lastMessageAt: daysAgo(9),
            createdAt: daysAgo(12),
        },
    });
    await prisma.message.createMany({
        data: [
            { conversationId: conv1.id, senderId: c1.id, content: 'Hi! I just placed an order for an iPhone 15 Pro and a MacBook. When can I expect delivery?', isRead: true, readAt: daysAgo(12), createdAt: daysAgo(12) },
            { conversationId: conv1.id, senderId: vendors[0].id, content: 'Hello Mohammed! Thank you for your order. We will have it packed and shipped within 24 hours. You will receive a tracking number by email.', isRead: true, readAt: daysAgo(12), createdAt: daysAgo(12) },
            { conversationId: conv1.id, senderId: c1.id, content: 'Great, thank you! Will it come in the original Apple packaging?', isRead: true, readAt: daysAgo(11), createdAt: daysAgo(11) },
            { conversationId: conv1.id, senderId: vendors[0].id, content: 'Absolutely! All our Apple products are 100% genuine with original sealed packaging. Your tracking number is FX-7741234560-GU. Enjoy your new devices!', isRead: true, readAt: daysAgo(10), createdAt: daysAgo(10) },
            { conversationId: conv1.id, senderId: c1.id, content: 'Just received both items. Everything is perfect! Thank you for the fast delivery.', isRead: true, readAt: daysAgo(9), createdAt: daysAgo(9) },
            { conversationId: conv1.id, senderId: vendors[0].id, content: 'So glad to hear that! We appreciate your business. Do not forget to leave a review 😊', isRead: true, readAt: daysAgo(9), createdAt: daysAgo(9) },
        ],
    });
    // Conversation 2: Customer2 ↔ TechZone (about Order B — in transit)
    const conv2 = await prisma.conversation.create({
        data: {
            customerId: c2.id,
            vendorId: techVendor.id,
            orderId: orderB.id,
            lastMessageAt: hoursAgo(2),
            createdAt: daysAgo(3),
        },
    });
    await prisma.message.createMany({
        data: [
            { conversationId: conv2.id, senderId: c2.id, content: 'Hello, my order ORD-20260501-0002 shows shipped but I cannot find updates on the FedEx site. Can you help?', isRead: true, readAt: daysAgo(2), createdAt: daysAgo(2) },
            { conversationId: conv2.id, senderId: vendors[0].id, content: 'Hi Fatima! The tracking should update within 4-6 hours after handoff. Your package is currently at the FedEx Guam hub. Estimated delivery is in 2 days.', isRead: true, readAt: daysAgo(2), createdAt: daysAgo(2) },
            { conversationId: conv2.id, senderId: c2.id, content: 'Thank you! One more question — does the Samsung S24 Ultra come with a protective case?', isRead: true, readAt: hoursAgo(5), createdAt: hoursAgo(5) },
            { conversationId: conv2.id, senderId: vendors[0].id, content: 'It comes with the standard Samsung box contents. We do sell matching cases separately — check our accessories section!', isRead: false, createdAt: hoursAgo(2) },
        ],
    });
    // Conversation 3: Customer1 ↔ Island Fashion (about Order C)
    const conv3 = await prisma.conversation.create({
        data: {
            customerId: c1.id,
            vendorId: fashionVendor.id,
            orderId: orderC.id,
            lastMessageAt: hoursAgo(6),
            createdAt: daysAgo(1),
        },
    });
    await prisma.message.createMany({
        data: [
            { conversationId: conv3.id, senderId: c1.id, content: 'السلام عليكم! أريد أن أتأكد من قياس الكندورة. هل المقاس L مناسب لطول 180 سم؟', isRead: true, readAt: hoursAgo(20), createdAt: hoursAgo(22) },
            { conversationId: conv3.id, senderId: vendors[1].id, content: 'وعليكم السلام! نعم، المقاس L مناسب تماماً لطول 175-185 سم. الكندورة مصممة بقصة مريحة. هل تريد إضافة تطريز خاص؟', isRead: true, readAt: hoursAgo(15), createdAt: hoursAgo(18) },
            { conversationId: conv3.id, senderId: c1.id, content: 'شكراً جزيلاً! لا، التطريز الموجود كافٍ. هل يمكنكم التسليم هذا الأسبوع؟', isRead: true, readAt: hoursAgo(8), createdAt: hoursAgo(10) },
            { conversationId: conv3.id, senderId: vendors[1].id, content: 'بالتأكيد! سنكون جاهزين للشحن غداً الصباح. ستصلك رسالة مع رقم التتبع قريباً.', isRead: false, createdAt: hoursAgo(6) },
        ],
    });
    console.log(`   ✓ 5 orders in different stages seeded`);
    console.log(`   ✓ 3 payments (2 completed, 1 refunded, 1 pending)`);
    console.log(`   ✓ 3 shipments (delivered, in_transit, delivered-refunded)`);
    console.log(`   ✓ 7 vendor commissions (2 paid, 4 pending, 1 refund-pending)`);
    console.log(`   ✓ 1 refund record`);
    console.log(`   ✓ 2 coupon usages (WELCOME15, TECH10)`);
    console.log(`   ✓ 2 approved reviews (verified purchase)`);
    console.log(`   ✓ 12 notifications across all users`);
    console.log(`   ✓ 3 conversations + 14 messages`);
}
// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
