import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from '@google/genai';
import { IRAN_PROVINCES } from './data/iranProvinces';

const app = express();
const PORT = 3000;

// Enable high-performance HTTP compression (gzip/deflate) for all responses
app.use(compression({
  threshold: 1024, // Compress responses larger than 1KB
  level: 6 // Balanced speed & compression ratio
}));

// Security & Dynamic Cross-Origin Headers (Allow access from any web domain/IP)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Security Hardening Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Simple in-memory rate limiter to mitigate flood/brute-force attacks
const requestCounts = new Map<string, { count: number; resetTime: number }>();
function apiRateLimiter(maxRequestsPerMinute = 180) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = requestCounts.get(ip) || { count: 0, resetTime: now + 60000 };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + 60000;
    } else {
      clientData.count++;
    }

    requestCounts.set(ip, clientData);

    if (clientData.count > maxRequestsPerMinute) {
      return res.status(429).json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد مجدداً تلاش کنید.' });
    }
    next();
  };
}

app.use('/api/', apiRateLimiter(200));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const CONFIG_PATH = path.join(process.cwd(), 'db-config.json');
const STORE_PATH = path.join(process.cwd(), 'local-store.json');

// Memory cache / fallbacks
let dbPool: mysql.Pool | null = null;
let isDbConnected = false;
let currentDbConfig: any = null;
let serverStateVersion = Date.now();

const dbLogs: Array<{ id: string; timestamp: number; type: 'info' | 'success' | 'error' | 'query'; message: string }> = [
  { id: '1', timestamp: Date.now(), type: 'info', message: 'سامانه ذخیره‌سازی داده‌ها و دیتابیس هوشمند آماده به کار است.' }
];

function logDb(type: 'info' | 'success' | 'error' | 'query', message: string) {
  dbLogs.unshift({ id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6), timestamp: Date.now(), type, message });
  if (dbLogs.length > 100) dbLogs.pop();
}

// Default empty structures
const DEFAULT_STORE = {
  listings: [],
  users: [],
  categories: [
    { id: 'apt', name: 'آپارتمان', icon: '🏢', freeAdLimitDays: 20, maxFreeAdsPerPeriod: 1 },
    { id: 'house', name: 'ویلایی و خانه', icon: '🏡', freeAdLimitDays: 20, maxFreeAdsPerPeriod: 1 },
    { id: 'office', name: 'اداری و تجاری', icon: '💼', freeAdLimitDays: 15, maxFreeAdsPerPeriod: 1 },
    { id: 'land', name: 'زمین و کلنگی', icon: '🏗️', freeAdLimitDays: 30, maxFreeAdsPerPeriod: 1 },
    { id: 'garden', name: 'باغ و باغچه', icon: '🌳', freeAdLimitDays: 20, maxFreeAdsPerPeriod: 1 },
    { id: 'shop', name: 'مغازه و غرفه', icon: '🏪', freeAdLimitDays: 15, maxFreeAdsPerPeriod: 1 }
  ],
  provinces: IRAN_PROVINCES,
  promotionPlans: [
    { id: 'ladder', title: 'نردبان', price: '۳۹,۰۰۰', durationDays: 0, contactVisible: true, priorityLevel: 1, features: ['بازگشت آنی به بالای لیست', 'افزایش بازدید فوری'], color: 'bg-slate-100 border-slate-200 text-slate-700', icon: '🪜' },
    { id: 'urgent', title: 'فوری', price: '۹۹,۰۰۰', durationDays: 7, contactVisible: true, priorityLevel: 3, features: ['برچسب "فوری" برای ۷ روز', 'نمایش در نتایج بالاتر', 'تمایز رنگی در لیست'], color: 'bg-rose-50 border-rose-200 text-rose-800', icon: '🔥' },
    { id: 'special', title: 'ویژه', price: '۲۴۹,۰۰۰', durationDays: 45, contactVisible: true, priorityLevel: 4, features: ['نمایش در اسلایدر صفحه اصلی', 'بالاترین اولویت نمایش', 'نشان "ویژه" و درخشش نئونی', '۴۵ روز اعتبار'], color: 'bg-cyan-50 border-cyan-200 text-cyan-800', icon: '💎' }
  ],
  listingPackages: [
    {
      id: 'lpkg_starter',
      title: 'پکیج برنزی ۵ تایی',
      description: 'مناسب مالکین شخصی با سهمیه ثبت ۵ آگهی ملک',
      adCount: 5,
      price: 90000,
      durationDays: 30,
      badge: 'اقتصادی',
      ladderBonusCount: 1,
      featuredBonusCount: 0,
      isActive: true,
      createdAt: '2026-09-05T00:00:00.000Z'
    },
    {
      id: 'lpkg_silver',
      title: 'پکیج نقره‌ای ۱۵ تایی',
      description: 'پرفروش‌ترین بسته ویژه مشاورین و فعالان املاک همراه با هدیه نردبان و فوری',
      adCount: 15,
      price: 240000,
      durationDays: 60,
      badge: 'پیشنهاد ویژه',
      ladderBonusCount: 3,
      featuredBonusCount: 1,
      isActive: true,
      createdAt: '2026-09-05T00:00:00.000Z'
    },
    {
      id: 'lpkg_gold',
      title: 'پکیج طلایی ۴۰ تایی VIP',
      description: 'ویژه آژانس‌های املاک و مشاورین حرفه‌ای با تخفیف ویژه و هدایای اختصاصی',
      adCount: 40,
      price: 550000,
      durationDays: 90,
      badge: 'حرفه‌ای',
      ladderBonusCount: 10,
      featuredBonusCount: 5,
      isActive: true,
      createdAt: '2026-09-05T00:00:00.000Z'
    }
  ],
  userPackages: [],
  supportTickets: [],
  expirationSettings: {
    defaultLifetimeDays: 30,
    expiryAction: 'archive',
    autoCleanupEnabled: true
  },
  zarinPalConfig: {
    merchantId: '',
    isSandbox: true,
    isEnabled: false
  },
  cardPaymentConfig: {
    isEnabled: true,
    bankName: 'بانک ملی ایران',
    cardNumber: '6037-9918-1234-5678',
    accountHolder: 'مدیریت آگهی هوشمند املاک',
    iban: 'IR120170000000123456789012',
    description: 'لطفاً پس از واریز وجه، تصویر فیش و یا شماره پیگیری را جهت بررسی و فعال‌سازی سرویس ارسال نمایید.'
  },
  paymentReceipts: [],
  meliPayamakConfig: {
    username: '',
    password: '',
    senderNumber: '',
    isEnabled: false,
    events: {
      otpLogin: true,
      adStatus: true,
      newMessage: true,
      purchaseStatus: true,
      loginAlert: true,
      welcomeMessage: true,
      passwordRecovery: true
    }
  },
  adSlots: [
    { id: 'ad_hero_1', position: 'hero', title: 'فرصت استثنایی سرمایه‌گذاری ملکی و پیش‌فروش برج‌های ساحلی', imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 3 },
    { id: 'ad_hero_2', position: 'hero', title: 'ویلای لوکس کوهستانی با سند تک‌برگ و چشم‌انداز ابدی', imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 2 },
    { id: 'ad_hero_3', position: 'hero', title: 'پنت‌هاوس مدرن با امکانات هتلینگ و روف‌گاردن اختصاصی', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 },
    { id: 'ad_feed_1', position: 'in-feed', title: 'تسهیلات بانکی و وام کم‌بهره ساخت و خرید مسکن', imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 2 },
    { id: 'ad_feed_2', position: 'in-feed', title: 'مشاوره حقوقی تخصصی در قراردادهای ملکی و سرقفلی', imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 },
    { id: 'ad_sidebar_1', position: 'sidebar', title: 'طراحی دکوراسیون و بازسازی هوشمند داخلی', imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=70', linkUrl: '#', isActive: true, priority: 1 },
    { id: 'ad_footer_1', position: 'footer', title: 'بیمه آتش‌سوزی و جامع زلزله و حوادث ساختمان', imageUrl: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1200&q=70', linkUrl: '#', isActive: true, priority: 1 }
  ],
  trustBadges: [
    { id: 'badge_enamad', title: 'اینماد', subtitle: 'نماد اعتماد الکترونیکی', imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=200&q=80', linkUrl: 'https://enamad.ir', isActive: true },
    { id: 'badge_samandehi', title: 'ساماندهی', subtitle: 'نشان ثبت رسانه‌های دیجیتال', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=200&q=80', linkUrl: 'https://samandehi.ir', isActive: true },
    { id: 'badge_union', title: 'اتحادیه املاک', subtitle: 'پروانه کسب تخصصی املاک', imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=200&q=80', linkUrl: '#', isActive: true },
    { id: 'badge_zarinpal', title: 'درگاه زرین‌پال', subtitle: 'تضمین امنیت پرداخت', imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67568d0d9f?auto=format&fit=crop&w=200&q=80', linkUrl: 'https://zarinpal.com', isActive: true }
  ],
  conversations: [],
  bannerSliderConfig: {
    autoSlideEnabled: true,
    autoSlideIntervalSeconds: 5
  },
  siteBranding: {
    siteName: 'آگهی هوشمند املاک',
    siteSubtitle: 'سامانه جامع معاملات، خرید، فروش و رهن و اجاره ملک',
    logoUrl: '',
    logoIcon: '🏢',
    autoRedirectToPwa: true,
    sessionTimeoutMinutes: 10,
    activeUsersCountBase: 1200
  },
  aiConfig: {
    apiKey: '',
    baseUrl: '',
    selectedModel: 'gemini-flash-latest',
    systemInstruction: 'شما یک دستیار هوشمند و تحلیلگر برای پلتفرم جامع املاک هستید.'
  },
  adminCredentials: { username: 'admin', passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' }
};

// Helper to read local-store.json
function readLocalStore() {
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
    return DEFAULT_STORE;
  }
  try {
    const data = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse local store:', e);
    return DEFAULT_STORE;
  }
}

// Helper to write local-store.json
function writeLocalStore(data: any) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write local store:', e);
  }
}

// Initialize MySQL pool from saved config
async function initDbPool() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const rawConfig = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const dbConfig = JSON.parse(rawConfig);
      currentDbConfig = dbConfig;

      if (dbConfig.mode === 'local') {
        isDbConnected = false;
        console.log('App configured in Local Storage/JSON mode.');
        logDb('info', 'سیستم در حالت ذخیره‌سازی محلی (Local JSON Storage) اجرا شد.');
        return;
      }

      dbPool = mysql.createPool({
        host: dbConfig.host,
        port: Number(dbConfig.port || 3306),
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      // Test the pool
      const conn = await dbPool.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      isDbConnected = true;
      logDb('success', `اتصال به پایگاه داده MySQL (${dbConfig.database}@${dbConfig.host}) با موفقیت برقرار شد.`);
      console.log('MySQL Database pool successfully initialized.');
    } catch (e: any) {
      console.error('Failed to initialize MySQL pool from saved config:', e);
      logDb('error', `خطا در اتصال به دیتابیس MySQL: ${e.message || 'عدم دسترسی'}. بازگشت موقت به حالت محلی.`);
      isDbConnected = false;
    }
  } else {
    console.log('No db-config.json found. App is running in Local Storage/JSON fallback mode.');
    logDb('info', 'فایل تنظیمات دیتابیس موجود نیست؛ برنامه با حافظه محلی لوکال اجرا شد.');
  }
}

// Safe column addition helper
async function safeAddColumn(conn: any, table: string, column: string, colDef: string) {
  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (!cols || (cols as any[]).length === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef}`);
    }
  } catch (e) {
    // Ignore migration warning
  }
}

// Run DB setup & create all 21 tables with full data columns and migrations
async function runSetup(pool: mysql.Pool) {
  const conn = await pool.getConnection();
  try {
    // 1. Listings
    await conn.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT,
        type VARCHAR(50),
        category VARCHAR(100),
        province VARCHAR(100),
        city VARCHAR(100),
        neighborhood TEXT,
        size DECIMAL(12,2) DEFAULT 0,
        price DECIMAL(24,2) DEFAULT 0,
        deposit DECIMAL(24,2) DEFAULT 0,
        rent DECIMAL(24,2) DEFAULT 0,
        status VARCHAR(50),
        promotion VARCHAR(50),
        createdAt BIGINT,
        expiryDate BIGINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100),
        password TEXT,
        phone VARCHAR(50),
        role VARCHAR(50),
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Categories
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100),
        icon TEXT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Provinces
    await conn.query(`
      CREATE TABLE IF NOT EXISTS provinces (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100),
        cities MEDIUMTEXT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Promotion Plans
    await conn.query(`
      CREATE TABLE IF NOT EXISTS promotion_plans (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT,
        price VARCHAR(100),
        durationDays INT,
        contactVisible TINYINT,
        priorityLevel INT,
        features MEDIUMTEXT,
        icon TEXT,
        color TEXT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Listing Packages
    await conn.query(`
      CREATE TABLE IF NOT EXISTS listing_packages (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT,
        adCount INT,
        price DECIMAL(24,2) DEFAULT 0,
        durationDays INT,
        isActive TINYINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. User Packages
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_packages (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100),
        packageId VARCHAR(100),
        status VARCHAR(50),
        remainingAds INT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Support Tickets
    await conn.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100),
        status VARCHAR(50),
        subject TEXT,
        createdAt BIGINT,
        updatedAt BIGINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Expiration Settings
    await conn.query(`
      CREATE TABLE IF NOT EXISTS expiration_settings (
        id VARCHAR(50) PRIMARY KEY,
        defaultLifetimeDays INT,
        expiryAction VARCHAR(50),
        autoCleanupEnabled TINYINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. ZarinPal Config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS zarinpal_config (
        id VARCHAR(50) PRIMARY KEY,
        merchantId TEXT,
        isSandbox TINYINT,
        isEnabled TINYINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. MeliPayamak Config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS melipayamak_config (
        id VARCHAR(50) PRIMARY KEY,
        username TEXT,
        password TEXT,
        senderNumber TEXT,
        isEnabled TINYINT,
        events MEDIUMTEXT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Ad Slots
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ad_slots (
        id VARCHAR(100) PRIMARY KEY,
        position VARCHAR(50),
        title TEXT,
        imageUrl TEXT,
        linkUrl TEXT,
        isActive TINYINT,
        priority INT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. Conversations
    await conn.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(100) PRIMARY KEY,
        listingId VARCHAR(100),
        ownerId VARCHAR(100),
        seekerId VARCHAR(100),
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. Admin Credentials
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_creds (
        username VARCHAR(100) PRIMARY KEY,
        passwordHash TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 15. Card Payment Config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS card_payment_config (
        id VARCHAR(50) PRIMARY KEY,
        bankName TEXT,
        cardNumber TEXT,
        accountHolder TEXT,
        iban TEXT,
        description TEXT,
        isEnabled TINYINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 16. Payment Receipts
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100),
        listingId VARCHAR(100),
        status VARCHAR(50),
        trackingCode VARCHAR(100),
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 17. Trust Badges
    await conn.query(`
      CREATE TABLE IF NOT EXISTS trust_badges (
        id VARCHAR(100) PRIMARY KEY,
        title TEXT,
        subtitle TEXT,
        imageUrl TEXT,
        linkUrl TEXT,
        isActive TINYINT,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 18. Banner Slider Config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS banner_slider_config (
        id VARCHAR(50) PRIMARY KEY,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 19. Site Branding Config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS site_branding (
        id VARCHAR(50) PRIMARY KEY,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 20. AI Config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ai_config (
        id VARCHAR(50) PRIMARY KEY,
        data MEDIUMTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 21. Master Key-Value App State Backup
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key_name VARCHAR(100) PRIMARY KEY,
        data MEDIUMTEXT,
        updatedAt BIGINT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Safe column migrations on existing database tables
    await safeAddColumn(conn, 'categories', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'provinces', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'promotion_plans', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'listing_packages', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'user_packages', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'support_tickets', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'card_payment_config', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'expiration_settings', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'zarinpal_config', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'melipayamak_config', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'ad_slots', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'trust_badges', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'listings', 'data', 'MEDIUMTEXT');
    await safeAddColumn(conn, 'listings', 'deposit', 'DECIMAL(24,2) DEFAULT 0');
    await safeAddColumn(conn, 'listings', 'rent', 'DECIMAL(24,2) DEFAULT 0');

    try { await conn.query('ALTER TABLE listings MODIFY COLUMN size DECIMAL(12,2) DEFAULT 0;'); } catch {}
    try { await conn.query('ALTER TABLE listings MODIFY COLUMN price DECIMAL(24,2) DEFAULT 0;'); } catch {}
    try { await conn.query('ALTER TABLE listings MODIFY COLUMN id VARCHAR(100);'); } catch {}
    try { await conn.query('ALTER TABLE users MODIFY COLUMN id VARCHAR(100);'); } catch {}
    try { await conn.query('ALTER TABLE promotion_plans MODIFY COLUMN price VARCHAR(100);'); } catch {}
    try { await conn.query('ALTER TABLE listing_packages MODIFY COLUMN price DECIMAL(24,2) DEFAULT 0;'); } catch {}

    logDb('info', 'ساختار جامع پایگاه داده MySQL با موفقیت بررسی، بروزرسانی و آماده‌سازی شد.');
    console.log('MySQL schemas checked/created successfully for all entities.');
  } finally {
    conn.release();
  }
}

// Seed helper (from local-store or fallback defaults)
async function seedMySQL(pool: mysql.Pool, data: any) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Categories
    for (const c of data.categories || DEFAULT_STORE.categories || []) {
      await conn.query(
        'REPLACE INTO categories (id, name, icon, data) VALUES (?, ?, ?, ?)',
        [c.id, c.name || '', c.icon || '', JSON.stringify(c)]
      );
    }

    // 2. Provinces
    for (const p of data.provinces || DEFAULT_STORE.provinces || []) {
      await conn.query(
        'REPLACE INTO provinces (id, name, cities, data) VALUES (?, ?, ?, ?)',
        [p.id, p.name || '', JSON.stringify(p.cities || []), JSON.stringify(p)]
      );
    }

    // 3. Promotion Plans
    for (const pl of data.promotionPlans || DEFAULT_STORE.promotionPlans || []) {
      await conn.query(
        'REPLACE INTO promotion_plans (id, title, price, durationDays, contactVisible, priorityLevel, features, icon, color, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pl.id,
          pl.title || '',
          String(pl.price || '0'),
          Number(pl.durationDays) || 30,
          pl.contactVisible ? 1 : 0,
          Number(pl.priorityLevel) || 0,
          JSON.stringify(pl.features || []),
          pl.icon || '',
          pl.color || '',
          JSON.stringify(pl)
        ]
      );
    }

    // 4. Listing Packages
    for (const pkg of data.listingPackages || DEFAULT_STORE.listingPackages || []) {
      await conn.query(
        'REPLACE INTO listing_packages (id, title, adCount, price, durationDays, isActive, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          pkg.id,
          pkg.title || '',
          Number(pkg.adCount) || 0,
          Number(pkg.price) || 0,
          Number(pkg.durationDays) || 30,
          pkg.isActive !== false ? 1 : 0,
          JSON.stringify(pkg)
        ]
      );
    }

    // 5. User Packages
    for (const upkg of data.userPackages || []) {
      await conn.query(
        'REPLACE INTO user_packages (id, userId, packageId, status, remainingAds, data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          upkg.id,
          upkg.userId || '',
          upkg.packageId || '',
          upkg.status || 'active',
          Number(upkg.remainingAds) || 0,
          JSON.stringify(upkg)
        ]
      );
    }

    // 6. Support Tickets
    for (const t of data.supportTickets || []) {
      await conn.query(
        'REPLACE INTO support_tickets (id, userId, status, subject, createdAt, updatedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          t.id,
          t.userId || '',
          t.status || 'open',
          t.subject || '',
          Number(t.createdAt) || Date.now(),
          Number(t.updatedAt) || Date.now(),
          JSON.stringify(t)
        ]
      );
    }

    // 7. Expiration Settings
    const ex = data.expirationSettings || DEFAULT_STORE.expirationSettings;
    await conn.query('REPLACE INTO expiration_settings (id, defaultLifetimeDays, expiryAction, autoCleanupEnabled, data) VALUES (?, ?, ?, ?, ?)', [
      'default',
      Number(ex.defaultLifetimeDays) || 30,
      ex.expiryAction || 'archive',
      ex.autoCleanupEnabled ? 1 : 0,
      JSON.stringify(ex)
    ]);

    // 8. ZarinPal
    const zp = data.zarinPalConfig || DEFAULT_STORE.zarinPalConfig;
    await conn.query('REPLACE INTO zarinpal_config (id, merchantId, isSandbox, isEnabled, data) VALUES (?, ?, ?, ?, ?)', [
      'default',
      zp.merchantId || '',
      zp.isSandbox ? 1 : 0,
      zp.isEnabled ? 1 : 0,
      JSON.stringify(zp)
    ]);

    // 9. MeliPayamak
    const mp = data.meliPayamakConfig || DEFAULT_STORE.meliPayamakConfig;
    await conn.query('REPLACE INTO melipayamak_config (id, username, password, senderNumber, isEnabled, events, data) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'default',
      mp.username || '',
      mp.password || '',
      mp.senderNumber || '',
      mp.isEnabled ? 1 : 0,
      JSON.stringify(mp.events || {}),
      JSON.stringify(mp)
    ]);

    // 10. Ad Slots
    for (const ad of data.adSlots || DEFAULT_STORE.adSlots || []) {
      await conn.query(
        'REPLACE INTO ad_slots (id, position, title, imageUrl, linkUrl, isActive, priority, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          ad.id,
          ad.position || 'sidebar',
          ad.title || '',
          ad.imageUrl || '',
          ad.linkUrl || '',
          ad.isActive ? 1 : 0,
          Number(ad.priority) || 0,
          JSON.stringify(ad)
        ]
      );
    }

    // 11. Listings
    for (const l of data.listings || []) {
      const numPrice = (l.price !== '' && l.price !== undefined && l.price !== null && !isNaN(Number(l.price))) ? Number(l.price) : 0;
      const numDeposit = (l.deposit !== '' && l.deposit !== undefined && l.deposit !== null && !isNaN(Number(l.deposit))) ? Number(l.deposit) : 0;
      const numRent = (l.rent !== '' && l.rent !== undefined && l.rent !== null && !isNaN(Number(l.rent))) ? Number(l.rent) : 0;
      const numSize = (l.size !== '' && l.size !== undefined && l.size !== null && !isNaN(Number(l.size))) ? Number(l.size) : 0;
      const numCreatedAt = typeof l.createdAt === 'number' ? l.createdAt : (Date.parse(l.createdAt) || Date.now());
      const numExpiryDate = typeof l.expiryDate === 'number' ? l.expiryDate : (Date.parse(l.expiryDate) || Date.now());

      await conn.query(
        'REPLACE INTO listings (id, title, type, category, province, city, neighborhood, size, price, deposit, rent, status, promotion, createdAt, expiryDate, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          l.id,
          l.title || '',
          l.type || 'sale',
          l.category || '',
          l.province || '',
          l.city || '',
          l.neighborhood || '',
          numSize,
          numPrice,
          numDeposit,
          numRent,
          l.status || 'approved',
          l.promotion || 'free',
          numCreatedAt,
          numExpiryDate,
          JSON.stringify(l)
        ]
      );
    }

    // 12. Users
    for (const u of data.users || []) {
      await conn.query('REPLACE INTO users (id, username, password, phone, role, data) VALUES (?, ?, ?, ?, ?, ?)', [
        u.id,
        u.username || '',
        u.password || '',
        u.phone || '',
        u.role || 'user',
        JSON.stringify(u)
      ]);
    }

    // 13. Conversations
    for (const cv of data.conversations || []) {
      await conn.query('REPLACE INTO conversations (id, listingId, ownerId, seekerId, data) VALUES (?, ?, ?, ?, ?)', [
        cv.id,
        cv.listingId || '',
        cv.ownerId || '',
        cv.seekerId || '',
        JSON.stringify(cv)
      ]);
    }

    // 14. Admin credentials
    const ac = data.adminCredentials || DEFAULT_STORE.adminCredentials;
    await conn.query('DELETE FROM admin_creds');
    await conn.query('REPLACE INTO admin_creds (username, passwordHash) VALUES (?, ?)', [ac.username, ac.passwordHash]);

    // 15. Card Payment Config
    const cp = data.cardPaymentConfig || DEFAULT_STORE.cardPaymentConfig;
    await conn.query('REPLACE INTO card_payment_config (id, bankName, cardNumber, accountHolder, iban, description, isEnabled, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      'default',
      cp.bankName || 'بانک ملی ایران',
      cp.cardNumber || '',
      cp.accountHolder || '',
      cp.iban || '',
      cp.description || '',
      cp.isEnabled !== false ? 1 : 0,
      JSON.stringify(cp)
    ]);

    // 16. Payment Receipts
    for (const r of data.paymentReceipts || []) {
      await conn.query('REPLACE INTO payment_receipts (id, userId, listingId, status, trackingCode, data) VALUES (?, ?, ?, ?, ?, ?)', [
        r.id || ('rcpt_' + Date.now()),
        r.userId || '',
        r.listingId || '',
        r.status || 'pending',
        r.trackingCode || '',
        JSON.stringify(r)
      ]);
    }

    // 17. Trust Badges
    for (const b of data.trustBadges || DEFAULT_STORE.trustBadges || []) {
      await conn.query('REPLACE INTO trust_badges (id, title, subtitle, imageUrl, linkUrl, isActive, data) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        b.id,
        b.title || '',
        b.subtitle || '',
        b.imageUrl || '',
        b.linkUrl || '',
        b.isActive ? 1 : 0,
        JSON.stringify(b)
      ]);
    }

    // 18. Banner Slider Config
    const bSlider = data.bannerSliderConfig || DEFAULT_STORE.bannerSliderConfig;
    await conn.query('REPLACE INTO banner_slider_config (id, data) VALUES (?, ?)', ['default', JSON.stringify(bSlider)]);

    // 19. Site Branding Config
    const sBranding = data.siteBranding || DEFAULT_STORE.siteBranding;
    await conn.query('REPLACE INTO site_branding (id, data) VALUES (?, ?)', ['default', JSON.stringify(sBranding)]);

    // 20. AI Config
    const aConf = data.aiConfig || DEFAULT_STORE.aiConfig;
    await conn.query('REPLACE INTO ai_config (id, data) VALUES (?, ?)', ['default', JSON.stringify(aConf)]);

    // 21. Master State Table Backup for all keys
    for (const [k, val] of Object.entries(data)) {
      if (['currentUser', 'isAdminAuthenticated', 'currentPage', 'activeSessionRole'].includes(k)) continue;
      try {
        await conn.query('REPLACE INTO app_state (key_name, data, updatedAt) VALUES (?, ?, ?)', [
          k,
          JSON.stringify(val),
          Date.now()
        ]);
      } catch {}
    }

    await conn.commit();
    logDb('success', 'تمام بخش‌های سامانه (آگهی‌ها، پکیج‌ها، تیکت‌ها، کاربران، فیش‌ها و تنظیمات) با موفقیت در پایگاه داده MySQL ذخیره و همگام‌سازی شدند.');
    console.log('MySQL full seed succeeded for all entities!');
  } catch (err) {
    await conn.rollback();
    console.error('MySQL seed failed:', err);
    logDb('error', `خطا در فرآیند انتقال داده‌ها به MySQL: ${err}`);
    throw err;
  } finally {
    conn.release();
  }
}

// Fetch all from MySQL with complete fallbacks
async function fetchAllMySQL() {
  if (!dbPool) throw new Error('Database not connected');
  const conn = await dbPool.getConnection();
  try {
    const [listingsRow] = await conn.query('SELECT data, id, title, type, category, province, city, neighborhood, size, price, deposit, rent, status, promotion, createdAt, expiryDate FROM listings') as any;
    const [usersRow] = await conn.query('SELECT data, id, username, phone, role FROM users') as any;
    const [categoriesRow] = await conn.query('SELECT * FROM categories') as any;
    const [provincesRow] = await conn.query('SELECT * FROM provinces') as any;
    const [plansRow] = await conn.query('SELECT * FROM promotion_plans') as any;
    const [packagesRow] = await conn.query('SELECT * FROM listing_packages') as any;
    const [userPackagesRow] = await conn.query('SELECT * FROM user_packages') as any;
    const [ticketsRow] = await conn.query('SELECT * FROM support_tickets') as any;
    const [expRow] = await conn.query('SELECT * FROM expiration_settings WHERE id = "default"') as any;
    const [zpRow] = await conn.query('SELECT * FROM zarinpal_config WHERE id = "default"') as any;
    const [mpRow] = await conn.query('SELECT * FROM melipayamak_config WHERE id = "default"') as any;
    const [adSlotsRow] = await conn.query('SELECT * FROM ad_slots') as any;
    const [convRow] = await conn.query('SELECT data FROM conversations') as any;
    const [adminRow] = await conn.query('SELECT * FROM admin_creds') as any;
    const [cardPayRow] = await conn.query('SELECT * FROM card_payment_config WHERE id = "default"') as any;
    const [receiptsRow] = await conn.query('SELECT data FROM payment_receipts') as any;
    const [trustBadgesRow] = await conn.query('SELECT * FROM trust_badges') as any;
    const [bannerRow] = await conn.query('SELECT data FROM banner_slider_config WHERE id = "default"') as any;
    const [brandingRow] = await conn.query('SELECT data FROM site_branding WHERE id = "default"') as any;
    const [aiRow] = await conn.query('SELECT data FROM ai_config WHERE id = "default"') as any;
    const [appStateRow] = await conn.query('SELECT key_name, data FROM app_state') as any;

    const appStateMap = new Map<string, any>();
    if (appStateRow && Array.isArray(appStateRow)) {
      for (const row of appStateRow) {
        try {
          appStateMap.set(row.key_name, JSON.parse(row.data));
        } catch {}
      }
    }

    const listings = (listingsRow || []).map((r: any) => {
      if (r.data) {
        try {
          const parsed = JSON.parse(r.data);
          return {
            ...parsed,
            id: r.id || parsed.id,
            price: parsed.price !== undefined ? parsed.price : Number(r.price),
            size: parsed.size !== undefined ? parsed.size : Number(r.size),
            status: parsed.status || r.status
          };
        } catch {}
      }
      return {
        id: r.id,
        title: r.title,
        type: r.type,
        category: r.category,
        province: r.province,
        city: r.city,
        neighborhood: r.neighborhood || '',
        size: Number(r.size) || 0,
        price: Number(r.price) || 0,
        deposit: Number(r.deposit) || 0,
        rent: Number(r.rent) || 0,
        images: [],
        keyFeatures: '',
        description: '',
        status: r.status,
        promotion: r.promotion,
        createdAt: Number(r.createdAt),
        expiryDate: Number(r.expiryDate)
      };
    });

    const users = (usersRow || []).map((r: any) => {
      if (r.data) {
        try { return JSON.parse(r.data); } catch {}
      }
      return {
        id: r.id,
        username: r.username,
        phone: r.phone,
        role: r.role
      };
    });

    const categories = (categoriesRow && categoriesRow.length > 0)
      ? categoriesRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return {
            id: r.id,
            name: r.name,
            icon: r.icon,
            freeAdLimitDays: 20,
            maxFreeAdsPerPeriod: 1
          };
        })
      : (appStateMap.get('categories') || DEFAULT_STORE.categories);

    const provinces = (provincesRow && provincesRow.length > 0)
      ? provincesRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return {
            id: r.id,
            name: r.name,
            cities: JSON.parse(r.cities || '[]')
          };
        })
      : (appStateMap.get('provinces') || DEFAULT_STORE.provinces);

    const promotionPlans = (plansRow && plansRow.length > 0)
      ? plansRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return {
            id: r.id,
            title: r.title,
            price: r.price,
            durationDays: r.durationDays,
            contactVisible: r.contactVisible === 1,
            priorityLevel: r.priorityLevel,
            features: JSON.parse(r.features || '[]'),
            icon: r.icon,
            color: r.color
          };
        })
      : (appStateMap.get('promotionPlans') || DEFAULT_STORE.promotionPlans);

    const listingPackages = (packagesRow && packagesRow.length > 0)
      ? packagesRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return {
            id: r.id,
            title: r.title,
            adCount: r.adCount,
            price: Number(r.price),
            durationDays: r.durationDays,
            isActive: r.isActive === 1
          };
        })
      : (appStateMap.get('listingPackages') || DEFAULT_STORE.listingPackages || []);

    const userPackages = (userPackagesRow && userPackagesRow.length > 0)
      ? userPackagesRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return r;
        })
      : (appStateMap.get('userPackages') || []);

    const supportTickets = (ticketsRow && ticketsRow.length > 0)
      ? ticketsRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return r;
        })
      : (appStateMap.get('supportTickets') || []);

    const expirationSettings = expRow && expRow[0]
      ? (expRow[0].data ? JSON.parse(expRow[0].data) : {
          defaultLifetimeDays: expRow[0].defaultLifetimeDays,
          expiryAction: expRow[0].expiryAction,
          autoCleanupEnabled: expRow[0].autoCleanupEnabled === 1
        })
      : (appStateMap.get('expirationSettings') || DEFAULT_STORE.expirationSettings);

    const zarinPalConfig = zpRow && zpRow[0]
      ? (zpRow[0].data ? JSON.parse(zpRow[0].data) : {
          merchantId: zpRow[0].merchantId,
          isSandbox: zpRow[0].isSandbox === 1,
          isEnabled: zpRow[0].isEnabled === 1
        })
      : (appStateMap.get('zarinPalConfig') || DEFAULT_STORE.zarinPalConfig);

    const meliPayamakConfig = mpRow && mpRow[0]
      ? (mpRow[0].data ? JSON.parse(mpRow[0].data) : {
          username: mpRow[0].username,
          password: mpRow[0].password,
          senderNumber: mpRow[0].senderNumber,
          isEnabled: mpRow[0].isEnabled === 1,
          events: JSON.parse(mpRow[0].events || '{}')
        })
      : (appStateMap.get('meliPayamakConfig') || DEFAULT_STORE.meliPayamakConfig);

    const adSlots = (adSlotsRow && adSlotsRow.length > 0)
      ? adSlotsRow.map((r: any) => {
          if (r.data) {
            try { return JSON.parse(r.data); } catch {}
          }
          return {
            id: r.id,
            position: r.position,
            title: r.title,
            imageUrl: r.imageUrl,
            linkUrl: r.linkUrl,
            isActive: r.isActive === 1,
            priority: r.priority
          };
        })
      : (appStateMap.get('adSlots') || DEFAULT_STORE.adSlots);

    const conversations = (convRow || []).map((r: any) => {
      try { return JSON.parse(r.data); } catch { return null; }
    }).filter(Boolean);

    const adminCredentials = (adminRow && adminRow[0])
      ? { username: adminRow[0].username, passwordHash: adminRow[0].passwordHash }
      : DEFAULT_STORE.adminCredentials;

    const cardPaymentConfig = cardPayRow && cardPayRow[0]
      ? (cardPayRow[0].data ? JSON.parse(cardPayRow[0].data) : {
          id: cardPayRow[0].id,
          bankName: cardPayRow[0].bankName,
          cardNumber: cardPayRow[0].cardNumber,
          accountHolder: cardPayRow[0].accountHolder,
          iban: cardPayRow[0].iban,
          description: cardPayRow[0].description,
          isEnabled: cardPayRow[0].isEnabled === 1
        })
      : (appStateMap.get('cardPaymentConfig') || DEFAULT_STORE.cardPaymentConfig);

    const paymentReceipts = (receiptsRow || []).map((r: any) => {
      try { return JSON.parse(r.data); } catch { return null; }
    }).filter(Boolean);

    const trustBadges = (trustBadgesRow && trustBadgesRow.length > 0)
      ? trustBadgesRow.map((b: any) => {
          if (b.data) {
            try { return JSON.parse(b.data); } catch {}
          }
          return {
            id: b.id,
            title: b.title,
            subtitle: b.subtitle,
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl,
            isActive: b.isActive === 1
          };
        })
      : (appStateMap.get('trustBadges') || DEFAULT_STORE.trustBadges);

    const bannerSliderConfig = bannerRow && bannerRow[0]
      ? (bannerRow[0].data ? JSON.parse(bannerRow[0].data) : DEFAULT_STORE.bannerSliderConfig)
      : (appStateMap.get('bannerSliderConfig') || DEFAULT_STORE.bannerSliderConfig);

    const siteBranding = brandingRow && brandingRow[0]
      ? (brandingRow[0].data ? JSON.parse(brandingRow[0].data) : DEFAULT_STORE.siteBranding)
      : (appStateMap.get('siteBranding') || DEFAULT_STORE.siteBranding);

    const aiConfig = aiRow && aiRow[0]
      ? (aiRow[0].data ? JSON.parse(aiRow[0].data) : DEFAULT_STORE.aiConfig)
      : (appStateMap.get('aiConfig') || DEFAULT_STORE.aiConfig);

    return {
      listings,
      users,
      categories,
      provinces,
      promotionPlans,
      listingPackages,
      userPackages,
      supportTickets,
      expirationSettings,
      zarinPalConfig,
      meliPayamakConfig,
      adSlots,
      conversations,
      currentUser: null,
      adminCredentials,
      cardPaymentConfig,
      paymentReceipts,
      trustBadges,
      bannerSliderConfig,
      siteBranding,
      aiConfig
    };
  } finally {
    conn.release();
  }
}

// API: DB Status
app.get('/api/db-status', (req, res) => {
  res.json({
    connected: isDbConnected,
    installed: fs.existsSync(CONFIG_PATH)
  });
});

// API: DB Logs & Table Audit
app.get('/api/db-logs', async (req, res) => {
  const store = readLocalStore();
  let tableCounts: Record<string, number> = {
    listings: store.listings ? store.listings.length : 0,
    users: store.users ? store.users.length : 0,
    paymentReceipts: store.paymentReceipts ? store.paymentReceipts.length : 0,
    conversations: store.conversations ? store.conversations.length : 0,
    categories: store.categories ? store.categories.length : 0,
    provinces: store.provinces ? store.provinces.length : 0,
    adSlots: store.adSlots ? store.adSlots.length : 0,
    listingPackages: store.listingPackages ? store.listingPackages.length : 0,
    userPackages: store.userPackages ? store.userPackages.length : 0,
    supportTickets: store.supportTickets ? store.supportTickets.length : 0
  };

  if (isDbConnected && dbPool) {
    try {
      const conn = await dbPool.getConnection();
      const [l]: any = await conn.query('SELECT COUNT(*) as cnt FROM listings');
      const [u]: any = await conn.query('SELECT COUNT(*) as cnt FROM users');
      const [r]: any = await conn.query('SELECT COUNT(*) as cnt FROM payment_receipts');
      const [c]: any = await conn.query('SELECT COUNT(*) as cnt FROM conversations');
      const [cat]: any = await conn.query('SELECT COUNT(*) as cnt FROM categories');
      const [prov]: any = await conn.query('SELECT COUNT(*) as cnt FROM provinces');
      const [ads]: any = await conn.query('SELECT COUNT(*) as cnt FROM ad_slots');
      const [pkgs]: any = await conn.query('SELECT COUNT(*) as cnt FROM listing_packages');
      const [upkgs]: any = await conn.query('SELECT COUNT(*) as cnt FROM user_packages');
      const [tix]: any = await conn.query('SELECT COUNT(*) as cnt FROM support_tickets');
      conn.release();
      tableCounts = {
        listings: l[0]?.cnt || 0,
        users: u[0]?.cnt || 0,
        paymentReceipts: r[0]?.cnt || 0,
        conversations: c[0]?.cnt || 0,
        categories: cat[0]?.cnt || 0,
        provinces: prov[0]?.cnt || 0,
        adSlots: ads[0]?.cnt || 0,
        listingPackages: pkgs[0]?.cnt || 0,
        userPackages: upkgs[0]?.cnt || 0,
        supportTickets: tix[0]?.cnt || 0
      };
    } catch (e) {
      console.warn('Error counting MySQL rows:', e);
    }
  }

  res.json({
    connected: isDbConnected,
    mode: isDbConnected ? 'پایگاه داده MySQL متصل است' : 'ذخیره‌سازی فایلی / حافظه محلی متصل است',
    configPathExists: fs.existsSync(CONFIG_PATH),
    config: fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) : null,
    tableCounts,
    logs: dbLogs
  });
});

// API: DB Setup & Connect
app.post('/api/db-setup', async (req, res) => {
  const { action, host, port, user, password, database, adminUser, adminPassHash, payload } = req.body;
  if (!host || !port || !user || !database) {
    return res.status(400).json({ error: 'لطفاً تمام فیلدهای هاست، پورت، نام کاربری و نام دیتابیس را پر کنید.' });
  }

  // If action is test
  if (action === 'test') {
    try {
      const testPool = mysql.createPool({
        host,
        port: Number(port),
        user,
        password: password || '',
        waitForConnections: true,
        connectionLimit: 1,
        connectTimeout: 5000
      });
      const conn = await testPool.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      await testPool.end();
      return res.json({ success: true, message: 'ارتباط با سرور MySQL با موفقیت آزمایش شد و تایید گردید! 🟢' });
    } catch (dbErr: any) {
      // If error is bad database name, check server connection without DB
      if (dbErr.code === 'ER_BAD_DB_ERROR' || (dbErr.message && dbErr.message.includes('database'))) {
        try {
          const testServerPool = mysql.createPool({
            host,
            port: Number(port),
            user,
            password: password || '',
            waitForConnections: true,
            connectionLimit: 1,
            connectTimeout: 5000
          });
          const conn = await testServerPool.getConnection();
          await conn.query('SELECT 1');
          conn.release();
          await testServerPool.end();
          return res.json({ 
            success: true, 
            message: `اتصال به سرور با موفقیت برقرار شد. دیتابیس "${database}" هنوز وجود ندارد و در زمان راه‌اندازی به صورت خودکار ایجاد خواهد شد.` 
          });
        } catch (serverErr: any) {
          return res.status(400).json({ error: serverErr.message || 'خطا در اتصال به سرور MySQL' });
        }
      }
      return res.status(400).json({ error: dbErr.message || 'خطا در ارتباط با سرور MySQL' });
    }
  }

  // Installation & full connection
  try {
    // 1. Connect without specifying the database to ensure we can create it if it doesn't exist
    const adminPool = mysql.createPool({
      host,
      port: Number(port),
      user,
      password: password || '',
      waitForConnections: true,
      connectionLimit: 1,
      connectTimeout: 7000
    });
    const adminConn = await adminPool.getConnection();
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    adminConn.release();
    await adminPool.end();

    // 2. Now connect with the specified database
    const tempPool = mysql.createPool({
      host,
      port: Number(port),
      user,
      password: password || '',
      database,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 7000
    });

    const conn = await tempPool.getConnection();
    await conn.query('SELECT 1');
    conn.release();

    // 3. Setup schemas and migrations
    await runSetup(tempPool);

    // 4. Populate existing local state + incoming live payload if any
    const localStore = readLocalStore();
    const sourceData = payload ? { ...localStore, ...payload } : localStore;

    if (adminUser && adminPassHash) {
      sourceData.adminCredentials = {
        username: adminUser,
        passwordHash: adminPassHash
      };
    } else if (!sourceData.adminCredentials || !sourceData.adminCredentials.username) {
      sourceData.adminCredentials = DEFAULT_STORE.adminCredentials;
    }

    // 5. Seed ALL existing data into MySQL
    await seedMySQL(tempPool, sourceData);

    // Update localStore as well
    writeLocalStore(sourceData);

    // 6. Save credentials file
    const configData = { host, port: Number(port), user, password: password || '', database, mode: 'mysql' };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf-8');
    currentDbConfig = configData;

    // 7. Swap current pool
    if (dbPool) {
      try { await dbPool.end(); } catch {}
    }
    dbPool = tempPool;
    isDbConnected = true;
    serverStateVersion = Date.now();

    logDb('success', `پایگاه داده MySQL (${database}@${host}) با موفقیت متصل شد و تمام داده‌ها در آن ذخیره گردیدند.`);
    res.json({ success: true, message: 'پایگاه داده MySQL با موفقیت متصل شد و تمام اطلاعات همگام‌سازی گردیدند.' });
  } catch (error: any) {
    console.error('MySQL setup error:', error);
    logDb('error', `خطا در راه‌اندازی MySQL: ${error.message}`);
    res.status(500).json({ error: error.message || 'خطا در اتصال به پایگاه داده MySQL' });
  }
});

// API: Test Connection
app.post('/api/db-test', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    try {
      const testPool = mysql.createPool({
        host,
        port: Number(port),
        user,
        password: password || '',
        database,
        waitForConnections: true,
        connectionLimit: 1,
        connectTimeout: 5000
      });
      const conn = await testPool.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      await testPool.end();
      res.json({ success: true, message: 'اتصال به دیتابیس موفقیت‌آمیز بود' });
    } catch (dbErr: any) {
      if (dbErr.code === 'ER_BAD_DB_ERROR' || (dbErr.message && dbErr.message.includes('database'))) {
        const testServerPool = mysql.createPool({
          host,
          port: Number(port),
          user,
          password: password || '',
          waitForConnections: true,
          connectionLimit: 1,
          connectTimeout: 5000
        });
        const conn = await testServerPool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        await testServerPool.end();
        res.json({ 
          success: true, 
          message: `اتصال به سرور با موفقیت برقرار شد. پایگاه داده "${database}" وجود ندارد و در مرحله بعد به صورت خودکار ایجاد خواهد شد.` 
        });
      } else {
        throw dbErr;
      }
    }
  } catch (error: any) {
    console.error('Connection test error:', error);
    res.status(500).json({ error: error.message || 'عدم اتصال به دیتابیس' });
  }
});

// Helper: Get effective merged AI configuration from memory, file and MySQL
async function getEffectiveAiConfig(): Promise<any> {
  const store = readLocalStore();
  let config = { ...DEFAULT_STORE.aiConfig, ...(store.aiConfig || {}) };
  if (isDbConnected && dbPool) {
    try {
      const conn = await dbPool.getConnection();
      const [aiRow] = await conn.query('SELECT data FROM ai_config WHERE id = "default"') as any;
      conn.release();
      if (aiRow && aiRow[0]?.data) {
        config = { ...config, ...JSON.parse(aiRow[0].data) };
      }
    } catch {}
  }
  return config;
}

// API: AI Configuration Persistence (Server-side permanent store)
app.get('/api/ai/config', async (req, res) => {
  const config = await getEffectiveAiConfig();
  res.json(config);
});

app.post('/api/ai/config', async (req, res) => {
  const config = req.body;
  const store = readLocalStore();
  store.aiConfig = {
    ...DEFAULT_STORE.aiConfig,
    ...config
  };
  writeLocalStore(store);

  if (isDbConnected && dbPool) {
    try {
      const conn = await dbPool.getConnection();
      await conn.query('REPLACE INTO ai_config (id, data) VALUES (?, ?)', ['default', JSON.stringify(store.aiConfig)]);
      await conn.query('REPLACE INTO app_state (key_name, data, updatedAt) VALUES (?, ?, ?)', ['aiConfig', JSON.stringify(store.aiConfig), Date.now()]);
      conn.release();
      serverStateVersion = Date.now();
      logDb('query', 'تنظیمات هوش مصنوعی در پایگاه داده MySQL بروزرسانی شد.');
    } catch (e: any) {
      console.error('Failed to save aiConfig to MySQL:', e);
      logDb('error', `خطا در ذخیره تنظیمات هوش مصنوعی در MySQL: ${e.message}`);
    }
  }

  res.json({ success: true, config: store.aiConfig });
});

// API: Site Branding Persistence
app.get('/api/branding', (req, res) => {
  const store = readLocalStore();
  res.json(store.siteBranding || DEFAULT_STORE.siteBranding);
});

app.post('/api/branding', async (req, res) => {
  const branding = req.body;
  const store = readLocalStore();
  store.siteBranding = {
    ...DEFAULT_STORE.siteBranding,
    ...branding
  };
  writeLocalStore(store);

  if (isDbConnected && dbPool) {
    try {
      const conn = await dbPool.getConnection();
      await conn.query('REPLACE INTO site_branding (id, data) VALUES (?, ?)', ['default', JSON.stringify(store.siteBranding)]);
      await conn.query('REPLACE INTO app_state (key_name, data, updatedAt) VALUES (?, ?, ?)', ['siteBranding', JSON.stringify(store.siteBranding), Date.now()]);
      conn.release();
      serverStateVersion = Date.now();
      logDb('query', 'تنظیمات برندینگ سامانه در MySQL بروزرسانی شد.');
    } catch (e: any) {
      console.error('Failed to save siteBranding to MySQL:', e);
      logDb('error', `خطا در ذخیره تنظیمات برندینگ در MySQL: ${e.message}`);
    }
  }

  res.json({ success: true, siteBranding: store.siteBranding });
});

// Real-time Active Users Tracking & Heartbeat
const activeSessionsMap = new Map<string, number>();

app.post('/api/stats/ping', (req, res) => {
  const sessionId = req.body?.sessionId || req.ip || 'session_' + Math.random().toString(36).substring(7);
  activeSessionsMap.set(sessionId, Date.now());
  
  // Cleanup sessions older than 15 minutes
  const now = Date.now();
  for (const [id, lastSeen] of activeSessionsMap.entries()) {
    if (now - lastSeen > 15 * 60 * 1000) {
      activeSessionsMap.delete(id);
    }
  }

  const store = readLocalStore();
  const baseCount = store.siteBranding?.activeUsersCountBase || 1200;
  const dynamicBonus = (activeSessionsMap.size * 3) + Math.floor((new Date().getMinutes() * 7) % 85);
  const totalActive = baseCount + dynamicBonus;

  res.json({
    success: true,
    activeUsers: totalActive,
    onlineNow: Math.max(activeSessionsMap.size, 1),
    label: `+${new Intl.NumberFormat('fa-IR').format(totalActive)} کاربر فعال امروز`
  });
});

app.get('/api/stats/active-users', (req, res) => {
  const store = readLocalStore();
  const baseCount = store.siteBranding?.activeUsersCountBase || 1200;
  const dynamicBonus = (activeSessionsMap.size * 3) + Math.floor((new Date().getMinutes() * 7) % 85);
  const totalActive = baseCount + dynamicBonus;

  res.json({
    activeUsers: totalActive,
    onlineNow: Math.max(activeSessionsMap.size, 1),
    label: `+${new Intl.NumberFormat('fa-IR').format(totalActive)} کاربر فعال امروز`
  });
});

// API: Fetch All Data (listings, users, categories, configs, etc.)
app.get('/api/data', async (req, res) => {
  try {
    let data: any;
    if (isDbConnected && dbPool) {
      data = await fetchAllMySQL();
    } else {
      // Fallback to local store
      data = readLocalStore();
    }

    // STRICT PRIVACY PROTECTION: Strip any sensitive session info from global state response
    if (data) {
      delete data.currentUser;
      delete data.isAdminAuthenticated;
      delete data.currentPage;
      delete data.activeSessionRole;
      if (!data.siteBranding) data.siteBranding = DEFAULT_STORE.siteBranding;
      if (!data.aiConfig) data.aiConfig = DEFAULT_STORE.aiConfig;
    }
    return res.json(data);
  } catch (e: any) {
    console.error('Failed to load data:', e);
    const fallbackStore = readLocalStore();
    delete fallbackStore.currentUser;
    delete fallbackStore.isAdminAuthenticated;
    delete fallbackStore.currentPage;
    delete fallbackStore.activeSessionRole;
    return res.json(fallbackStore);
  }
});

// API: Save State with Comprehensive Table Mapping & Master App State Dual-Layer
app.post('/api/save-state', async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing key' });

  // STRICT PRIVACY: Ignore client session state completely to prevent cross-account leakage
  if (['currentUser', 'isAdminAuthenticated', 'currentPage', 'activeSessionRole'].includes(key)) {
    return res.json({ success: true, ignored: true, message: 'Session data is strictly isolated on the client for privacy' });
  }

  // Always write to local JSON store first as a dual-write backup/fallback
  const localStore = readLocalStore();
  delete localStore.currentUser;
  delete localStore.isAdminAuthenticated;
  localStore[key] = value;
  writeLocalStore(localStore);

  if (isDbConnected && dbPool) {
    const conn = await dbPool.getConnection();
    try {
      await conn.beginTransaction();

      if (key === 'listings' && Array.isArray(value)) {
        const ids = value.map((l: any) => l.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM listings WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM listings');
        }
        for (const l of value) {
          const numPrice = (l.price !== '' && l.price !== undefined && l.price !== null && !isNaN(Number(l.price))) ? Number(l.price) : 0;
          const numDeposit = (l.deposit !== '' && l.deposit !== undefined && l.deposit !== null && !isNaN(Number(l.deposit))) ? Number(l.deposit) : 0;
          const numRent = (l.rent !== '' && l.rent !== undefined && l.rent !== null && !isNaN(Number(l.rent))) ? Number(l.rent) : 0;
          const numSize = (l.size !== '' && l.size !== undefined && l.size !== null && !isNaN(Number(l.size))) ? Number(l.size) : 0;
          const numCreatedAt = typeof l.createdAt === 'number' ? l.createdAt : (Date.parse(l.createdAt) || Date.now());
          const numExpiryDate = typeof l.expiryDate === 'number' ? l.expiryDate : (Date.parse(l.expiryDate) || Date.now());

          await conn.query(
            'REPLACE INTO listings (id, title, type, category, province, city, neighborhood, size, price, deposit, rent, status, promotion, createdAt, expiryDate, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              l.id,
              l.title || '',
              l.type || 'sale',
              l.category || '',
              l.province || '',
              l.city || '',
              l.neighborhood || '',
              numSize,
              numPrice,
              numDeposit,
              numRent,
              l.status || 'approved',
              l.promotion || 'free',
              numCreatedAt,
              numExpiryDate,
              JSON.stringify(l)
            ]
          );
        }
      } else if (key === 'users' && Array.isArray(value)) {
        const ids = value.map((u: any) => u.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM users WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM users');
        }
        for (const u of value) {
          await conn.query('REPLACE INTO users (id, username, password, phone, role, data) VALUES (?, ?, ?, ?, ?, ?)', [
            u.id,
            u.username || '',
            u.password || '',
            u.phone || '',
            u.role || 'user',
            JSON.stringify(u)
          ]);
        }
      } else if (key === 'categories' && Array.isArray(value)) {
        const ids = value.map((c: any) => c.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM categories WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM categories');
        }
        for (const c of value) {
          await conn.query('REPLACE INTO categories (id, name, icon, data) VALUES (?, ?, ?, ?)', [
            c.id,
            c.name || '',
            c.icon || '',
            JSON.stringify(c)
          ]);
        }
      } else if (key === 'provinces' && Array.isArray(value)) {
        const ids = value.map((p: any) => p.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM provinces WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM provinces');
        }
        for (const p of value) {
          await conn.query('REPLACE INTO provinces (id, name, cities, data) VALUES (?, ?, ?, ?)', [
            p.id,
            p.name || '',
            JSON.stringify(p.cities || []),
            JSON.stringify(p)
          ]);
        }
      } else if (key === 'promotionPlans' && Array.isArray(value)) {
        const ids = value.map((pl: any) => pl.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM promotion_plans WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM promotion_plans');
        }
        for (const pl of value) {
          await conn.query(
            'REPLACE INTO promotion_plans (id, title, price, durationDays, contactVisible, priorityLevel, features, icon, color, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              pl.id,
              pl.title || '',
              String(pl.price || '0'),
              Number(pl.durationDays) || 30,
              pl.contactVisible ? 1 : 0,
              Number(pl.priorityLevel) || 0,
              JSON.stringify(pl.features || []),
              pl.icon || '',
              pl.color || '',
              JSON.stringify(pl)
            ]
          );
        }
      } else if (key === 'listingPackages' && Array.isArray(value)) {
        const ids = value.map((pkg: any) => pkg.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM listing_packages WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM listing_packages');
        }
        for (const pkg of value) {
          await conn.query(
            'REPLACE INTO listing_packages (id, title, adCount, price, durationDays, isActive, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              pkg.id,
              pkg.title || '',
              Number(pkg.adCount) || 0,
              Number(pkg.price) || 0,
              Number(pkg.durationDays) || 30,
              pkg.isActive !== false ? 1 : 0,
              JSON.stringify(pkg)
            ]
          );
        }
      } else if (key === 'userPackages' && Array.isArray(value)) {
        const ids = value.map((upkg: any) => upkg.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM user_packages WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM user_packages');
        }
        for (const upkg of value) {
          await conn.query(
            'REPLACE INTO user_packages (id, userId, packageId, status, remainingAds, data) VALUES (?, ?, ?, ?, ?, ?)',
            [
              upkg.id,
              upkg.userId || '',
              upkg.packageId || '',
              upkg.status || 'active',
              Number(upkg.remainingAds) || 0,
              JSON.stringify(upkg)
            ]
          );
        }
      } else if (key === 'supportTickets' && Array.isArray(value)) {
        const ids = value.map((t: any) => t.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM support_tickets WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM support_tickets');
        }
        for (const t of value) {
          await conn.query(
            'REPLACE INTO support_tickets (id, userId, status, subject, createdAt, updatedAt, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              t.id,
              t.userId || '',
              t.status || 'open',
              t.subject || '',
              Number(t.createdAt) || Date.now(),
              Number(t.updatedAt) || Date.now(),
              JSON.stringify(t)
            ]
          );
        }
      } else if (key === 'expirationSettings') {
        await conn.query('REPLACE INTO expiration_settings (id, defaultLifetimeDays, expiryAction, autoCleanupEnabled, data) VALUES (?, ?, ?, ?, ?)', [
          'default',
          Number(value.defaultLifetimeDays) || 30,
          value.expiryAction || 'archive',
          value.autoCleanupEnabled ? 1 : 0,
          JSON.stringify(value)
        ]);
      } else if (key === 'zarinPalConfig') {
        await conn.query('REPLACE INTO zarinpal_config (id, merchantId, isSandbox, isEnabled, data) VALUES (?, ?, ?, ?, ?)', [
          'default',
          value.merchantId || '',
          value.isSandbox ? 1 : 0,
          value.isEnabled ? 1 : 0,
          JSON.stringify(value)
        ]);
      } else if (key === 'meliPayamakConfig') {
        await conn.query('REPLACE INTO melipayamak_config (id, username, password, senderNumber, isEnabled, events, data) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          'default',
          value.username || '',
          value.password || '',
          value.senderNumber || '',
          value.isEnabled ? 1 : 0,
          JSON.stringify(value.events || {}),
          JSON.stringify(value)
        ]);
      } else if (key === 'adSlots' && Array.isArray(value)) {
        const ids = value.map((ad: any) => ad.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM ad_slots WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM ad_slots');
        }
        for (const ad of value) {
          await conn.query(
            'REPLACE INTO ad_slots (id, position, title, imageUrl, linkUrl, isActive, priority, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              ad.id,
              ad.position || 'sidebar',
              ad.title || '',
              ad.imageUrl || '',
              ad.linkUrl || '',
              ad.isActive ? 1 : 0,
              Number(ad.priority) || 0,
              JSON.stringify(ad)
            ]
          );
        }
      } else if (key === 'conversations' && Array.isArray(value)) {
        const ids = value.map((cv: any) => cv.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM conversations WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM conversations');
        }
        for (const cv of value) {
          await conn.query('REPLACE INTO conversations (id, listingId, ownerId, seekerId, data) VALUES (?, ?, ?, ?, ?)', [
            cv.id,
            cv.listingId || '',
            cv.ownerId || '',
            cv.seekerId || '',
            JSON.stringify(cv)
          ]);
        }
      } else if (key === 'adminCredentials') {
        await conn.query('DELETE FROM admin_creds');
        await conn.query('REPLACE INTO admin_creds (username, passwordHash) VALUES (?, ?)', [value.username, value.passwordHash]);
      } else if (key === 'cardPaymentConfig') {
        await conn.query('REPLACE INTO card_payment_config (id, bankName, cardNumber, accountHolder, iban, description, isEnabled, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
          'default',
          value.bankName || 'بانک ملی ایران',
          value.cardNumber || '',
          value.accountHolder || '',
          value.iban || '',
          value.description || '',
          value.isEnabled !== false ? 1 : 0,
          JSON.stringify(value)
        ]);
      } else if (key === 'paymentReceipts' && Array.isArray(value)) {
        const ids = value.map((r: any) => r.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM payment_receipts WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM payment_receipts');
        }
        for (const r of value) {
          await conn.query('REPLACE INTO payment_receipts (id, userId, listingId, status, trackingCode, data) VALUES (?, ?, ?, ?, ?, ?)', [
            r.id,
            r.userId || '',
            r.listingId || '',
            r.status || 'pending',
            r.trackingCode || '',
            JSON.stringify(r)
          ]);
        }
      } else if (key === 'trustBadges' && Array.isArray(value)) {
        const ids = value.map((b: any) => b.id).filter(Boolean);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM trust_badges WHERE id NOT IN (?)`, [ids]);
        } else {
          await conn.query('DELETE FROM trust_badges');
        }
        for (const b of value) {
          await conn.query('REPLACE INTO trust_badges (id, title, subtitle, imageUrl, linkUrl, isActive, data) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            b.id,
            b.title || '',
            b.subtitle || '',
            b.imageUrl || '',
            b.linkUrl || '',
            b.isActive ? 1 : 0,
            JSON.stringify(b)
          ]);
        }
      } else if (key === 'bannerSliderConfig') {
        await conn.query('REPLACE INTO banner_slider_config (id, data) VALUES (?, ?)', ['default', JSON.stringify(value)]);
      } else if (key === 'siteBranding') {
        await conn.query('REPLACE INTO site_branding (id, data) VALUES (?, ?)', ['default', JSON.stringify(value)]);
      } else if (key === 'aiConfig') {
        await conn.query('REPLACE INTO ai_config (id, data) VALUES (?, ?)', ['default', JSON.stringify(value)]);
      }

      // Master key-value backup in MySQL app_state table
      await conn.query('REPLACE INTO app_state (key_name, data, updatedAt) VALUES (?, ?, ?)', [
        key,
        JSON.stringify(value),
        Date.now()
      ]);

      await conn.commit();
      serverStateVersion = Date.now();
      logDb('query', `بروزرسانی جدول "${key}" در پایگاه داده MySQL انجام شد.`);
      res.json({ success: true, version: serverStateVersion });
    } catch (err: any) {
      await conn.rollback();
      console.error('MySQL save-state transaction error:', err);
      logDb('error', `خطا در ذخیره سازی ${key} در MySQL: ${err.message}`);
      res.status(500).json({ error: err.message || 'Database transaction failed' });
    } finally {
      conn.release();
    }
  } else {
    // Already saved to localStore, so we are good!
    serverStateVersion = Date.now();
    logDb('query', `بروزرسانی داده "${key}" در حافظه محلی (Local JSON Storage) انجام شد.`);
    res.json({ success: true, localOnly: true, version: serverStateVersion });
  }
});

// API: Real-time Live State Sync Version
app.get('/api/sync-version', (req, res) => {
  res.json({
    version: serverStateVersion,
    timestamp: Date.now()
  });
});

// API: DB Configuration & Mode Switcher
app.get('/api/db-config', (req, res) => {
  let savedConfig = null;
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      savedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (e) {}
  }
  res.json({
    connected: isDbConnected,
    mode: isDbConnected ? 'mysql' : 'local',
    config: savedConfig ? {
      host: savedConfig.host || 'localhost',
      port: savedConfig.port || 3306,
      user: savedConfig.user || 'root',
      database: savedConfig.database || 'hoome24_db',
      mode: savedConfig.mode || (isDbConnected ? 'mysql' : 'local')
    } : {
      host: 'localhost',
      port: 3306,
      user: 'root',
      database: 'hoome24_db',
      mode: 'local'
    }
  });
});

app.post('/api/db-disconnect', async (req, res) => {
  try {
    if (dbPool) {
      await dbPool.end();
      dbPool = null;
    }
    isDbConnected = false;
    let savedConfig: any = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        savedConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      } catch (e) {}
    }
    savedConfig.mode = 'local';
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(savedConfig, null, 2));
    logDb('info', 'مدیر سیستم حالت ذخیره‌سازی را به "حافظه محلی (Local Store)" تغییر داد.');
    res.json({ success: true, mode: 'local' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db-sync', async (req, res) => {
  const { direction, payload } = req.body; // 'local-to-mysql' or 'mysql-to-local'
  try {
    if (!isDbConnected || !dbPool) {
      return res.status(400).json({ error: 'ابتدا باید به پایگاه داده MySQL متصل شوید.' });
    }
    if (direction === 'local-to-mysql') {
      const localData = payload ? { ...readLocalStore(), ...payload } : readLocalStore();
      await seedMySQL(dbPool, localData);
      writeLocalStore(localData);
      serverStateVersion = Date.now();
      logDb('success', 'انتقال موفقیت‌آمیز کلیه داده‌ها به دیتابیس MySQL انجام شد.');
      res.json({ success: true, message: 'اطلاعات با موفقیت به MySQL منتقل شدند.' });
    } else {
      const mysqlData = await fetchAllMySQL();
      writeLocalStore(mysqlData);
      serverStateVersion = Date.now();
      logDb('success', 'پشتیبان‌گیری از MySQL و ذخیره در حافظه محلی لوکال انجام شد.');
      res.json({ success: true, message: 'اطلاعات از MySQL در حافظه محلی ذخیره شدند.', data: mysqlData });
    }
  } catch (err: any) {
    console.error('DB Sync error:', err);
    logDb('error', `خطا در همگام‌سازی: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Helper to normalize Gemini model IDs and migrate deprecated models
function normalizeGeminiModel(model?: string): string {
  if (!model) return 'gemini-3.8-flash';
  const m = model.toLowerCase().trim();
  if (
    m === 'gemini-2.5-flash' ||
    m === 'gemini-2.5-pro' ||
    m === 'gemini-2.0-flash' ||
    m === 'gemini-2.0-pro' ||
    m === 'gemini-1.5-flash' ||
    m === 'gemini-1.5-pro' ||
    m === 'gemini-flash-latest' ||
    m === 'gemini-pro' ||
    m.includes('2.5') ||
    m.includes('2.0') ||
    m.includes('1.5')
  ) {
    return 'gemini-3.8-flash';
  }
  if (m.startsWith('gemini-')) {
    return model;
  }
  // When hitting Gemini SDK directly, if non-gemini model (e.g. gpt-4o, deepseek) was supplied, fallback to gemini-3.8-flash
  return 'gemini-3.8-flash';
}

// Resilient Gemini generator with automatic fallback on transient high demand or model errors
async function generateGeminiContentWithFallback(ai: any, preferredModel: string, prompt: string, systemInstruction?: string) {
  const cleanPrompt = (prompt || '').trim();
  if (!cleanPrompt) {
    throw new Error('متن ورودی هوش مصنوعی خالی است');
  }

  const normModel = normalizeGeminiModel(preferredModel);
  const candidateModels = Array.from(new Set([
    normModel,
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite'
  ]));

  let lastError: any;
  for (const m of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const configOptions: any = {};
        if (systemInstruction && typeof systemInstruction === 'string' && systemInstruction.trim()) {
          configOptions.systemInstruction = systemInstruction.trim();
        }
        const response = await ai.models.generateContent({
          model: m,
          contents: cleanPrompt,
          config: Object.keys(configOptions).length > 0 ? configOptions : undefined
        });
        if (response) return response;
      } catch (err: any) {
        lastError = err;
        const isUnavailable = err.status === 'UNAVAILABLE' || err.code === 503 || err.message?.includes('high demand') || err.message?.includes('503');
        if (isUnavailable && attempt === 0) {
          await new Promise(res => setTimeout(res, 300));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

// Clean and normalize API Base URLs
function normalizeAiBaseUrl(baseUrl?: string, endpoint: 'chat' | 'models' = 'chat'): string {
  if (!baseUrl) return '';
  let url = baseUrl.trim().replace(/\/+$/, '');
  
  if (endpoint === 'chat') {
    if (url.endsWith('/chat/completions')) return url;
    if (url.endsWith('/models')) url = url.replace(/\/models$/, '');
    return `${url}/chat/completions`;
  } else {
    if (url.endsWith('/models')) return url;
    if (url.endsWith('/chat/completions')) url = url.replace(/\/chat\/completions$/, '');
    return `${url}/models`;
  }
}

// Clean and sanitize API Keys
function sanitizeApiKey(key?: string): string {
  if (!key) return '';
  return key.trim().replace(/^Bearer\s+/i, '');
}

// API: AI Proxy & Chat (Eliminates CORS, works with Gemini & OpenAI compatible providers)
app.post('/api/ai/models', async (req, res) => {
  const savedConfig = await getEffectiveAiConfig();
  const rawApiKey = req.body?.apiKey || savedConfig?.apiKey || process.env.GEMINI_API_KEY || '';
  const apiKey = sanitizeApiKey(rawApiKey);
  const baseUrl = (req.body?.baseUrl || savedConfig?.baseUrl || '').trim();
  
  // If user is using Google Gemini natively
  const isDirectGemini = !baseUrl || baseUrl.includes('generativelanguage.googleapis.com');
  if (isDirectGemini) {
    return res.json({
      models: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (سریع، هوشمند و توصیه شده)' },
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (نسخه رسمی مدرن)' },
        { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite (فوق‌العاده سریع)' }
      ]
    });
  }

  // OpenAI compatible provider (e.g. ParsPack, OpenRouter, OpenAI, etc.)
  try {
    const cleanUrl = normalizeAiBaseUrl(baseUrl, 'models');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(cleanUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ 
        error: `خطای سرور ارائه‌دهنده هوش مصنوعی (${response.status}): ${text}` 
      });
    }

    const data: any = await response.json();
    let models: any[] = [];
    if (Array.isArray(data.data)) {
      models = data.data;
    } else if (Array.isArray(data.models)) {
      models = data.models;
    } else if (Array.isArray(data)) {
      models = data;
    }

    // Format models nicely with id and name
    const formattedModels = models.map((m: any) => {
      if (typeof m === 'string') return { id: m, name: m };
      return {
        id: m.id || m.name || m.model,
        name: m.name || m.id || m.model || 'مدل هوش مصنوعی'
      };
    }).filter(m => !!m.id);

    res.json({ models: formattedModels });
  } catch (err: any) {
    console.error('AI models fetch error:', err);
    res.status(500).json({ 
      error: err.name === 'AbortError' 
        ? 'زمان اتصال به سرور مدل‌ها به پایان رسید (Timeout). لطفاً آدرس را بررسی کنید.' 
        : (err.message || 'عدم امکان اتصال به سرور هوش مصنوعی') 
    });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const body = req.body || {};
  const config = body.config || {};
  const savedConfig = await getEffectiveAiConfig();

  const rawApiKey = body.apiKey || config?.apiKey || savedConfig?.apiKey || process.env.GEMINI_API_KEY || '';
  const apiKey = sanitizeApiKey(rawApiKey);
  const baseUrl = (body.baseUrl || config?.baseUrl || savedConfig?.baseUrl || '').trim();
  const rawModel = body.model || config?.selectedModel || savedConfig?.selectedModel || 'gemini-3.8-flash';

  // Extract prompt safely from prompt, command, message, text, query, contents, or messages array
  let prompt = '';
  if (typeof body.prompt === 'string' && body.prompt.trim()) {
    prompt = body.prompt.trim();
  } else if (typeof body.command === 'string' && body.command.trim()) {
    prompt = body.command.trim();
  } else if (typeof body.message === 'string' && body.message.trim()) {
    prompt = body.message.trim();
  } else if (typeof body.text === 'string' && body.text.trim()) {
    prompt = body.text.trim();
  } else if (typeof body.query === 'string' && body.query.trim()) {
    prompt = body.query.trim();
  } else if (typeof body.contents === 'string' && body.contents.trim()) {
    prompt = body.contents.trim();
  } else if (Array.isArray(body.messages) && body.messages.length > 0) {
    const userMsg = [...body.messages].reverse().find((m: any) => m && (m.role === 'user' || m.content || m.text));
    if (userMsg) {
      prompt = typeof userMsg.content === 'string' ? userMsg.content.trim() : (typeof userMsg.text === 'string' ? userMsg.text.trim() : JSON.stringify(userMsg));
    }
  }

  const systemInstruction = body.systemInstruction || config?.systemInstruction || savedConfig?.systemInstruction || '';

  if (!prompt) {
    return res.status(400).json({ error: 'متن درخواست هوش مصنوعی مشخص نشده است.' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'کلید دسترسی (API Key) هوش مصنوعی وارد یا تنظیم نشده است. لطفاً از پنل مدیریت تنظیمات هوش مصنوعی را کامل کنید.' });
  }

  // Route 1: Google Gemini (@google/genai)
  const isDirectGemini = !baseUrl || baseUrl.includes('generativelanguage.googleapis.com');
  if (isDirectGemini) {
    try {
      const model = normalizeGeminiModel(rawModel);
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const response = await generateGeminiContentWithFallback(ai, model, prompt, systemInstruction);
      const replyText = response.text || '';
      return res.json({
        text: replyText,
        choices: [{ message: { content: replyText } }]
      });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      return res.status(500).json({ error: `خطای سرویس جمینای: ${err.message || 'خطای ناشناخته'}` });
    }
  }

  // Route 2: OpenAI Compatible (ParsPack, OpenRouter, OpenAI, LocalAI, etc.)
  try {
    const cleanUrl = normalizeAiBaseUrl(baseUrl, 'chat');
    const model = rawModel || 'gpt-4o-mini';

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    // If provider rejected system message or temperature, try universal fallback payload
    if (!response.ok && response.status === 400) {
      const fallbackPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
      response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: fallbackPrompt }]
        })
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `خطای سرور هوش مصنوعی (${response.status}): ${errText}` });
    }

    const data: any = await response.json();
    
    // Parse response content flexibly across multiple provider schemas
    let reply = '';
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice.message?.content) {
        reply = typeof choice.message.content === 'string' ? choice.message.content : JSON.stringify(choice.message.content);
      } else if (choice.text) {
        reply = choice.text;
      } else if (choice.delta?.content) {
        reply = choice.delta.content;
      }
    } else if (data.text) {
      reply = data.text;
    } else if (data.reply) {
      reply = data.reply;
    } else if (data.response) {
      reply = data.response;
    } else if (typeof data === 'string') {
      reply = data;
    }

    return res.json({
      text: reply,
      choices: [{ message: { content: reply } }]
    });
  } catch (err: any) {
    console.error('OpenAI Compatible API Error:', err);
    return res.status(500).json({ 
      error: err.name === 'AbortError' 
        ? 'پاسخ هوش مصنوعی به دلیل طولانی شدن زمان اتصال قطع شد (Timeout).' 
        : `خطا در ارتباط با سرور هوش مصنوعی: ${err.message}` 
    });
  }
});

app.post('/api/ai/test', async (req, res) => {
  const { config } = req.body || {};
  const savedConfig = await getEffectiveAiConfig();
  try {
    const prompt = 'سلام، لطفاً در یک جمله کوتاه پاسخ بده تا اتصال هوش مصنوعی تایید شود.';
    const rawApiKey = config?.apiKey || savedConfig?.apiKey || process.env.GEMINI_API_KEY || '';
    const apiKey = sanitizeApiKey(rawApiKey);
    const baseUrl = (config?.baseUrl || savedConfig?.baseUrl || '').trim();
    const rawModel = config?.selectedModel || savedConfig?.selectedModel || 'gemini-3.8-flash';

    if (!apiKey) {
      return res.status(400).json({ error: 'کلید API هوش مصنوعی وارد یا ذخیره نشده است.' });
    }

    const isDirectGemini = !baseUrl || baseUrl.includes('generativelanguage.googleapis.com');
    if (isDirectGemini) {
      const model = normalizeGeminiModel(rawModel);
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const response = await generateGeminiContentWithFallback(ai, model, prompt);
      return res.json({ success: true, reply: response.text || 'اتصال موفقیت‌آمیز بود.' });
    }

    // OpenAI Compatible test
    const cleanUrl = normalizeAiBaseUrl(baseUrl, 'chat');
    const model = rawModel || 'gpt-4o-mini';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `پاسخ ناموفق از سرور هوش مصنوعی: ${errText}` });
    }

    const data: any = await response.json();
    let reply = '';
    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice.message?.content) {
        reply = typeof choice.message.content === 'string' ? choice.message.content : JSON.stringify(choice.message.content);
      } else if (choice.text) {
        reply = choice.text;
      }
    } else if (data.text) {
      reply = data.text;
    } else if (data.reply) {
      reply = data.reply;
    } else {
      reply = 'اتصال با موفقیت برقرار شد.';
    }

    return res.json({ success: true, reply: reply || 'اتصال با موفقیت برقرار شد.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'خطا در آزمون اتصال هوش مصنوعی' });
  }
});

// Start initialization
async function main() {
  await initDbPool();

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.match(/\.(js|css|woff2|woff|png|jpg|jpeg|svg|webp|ico)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
