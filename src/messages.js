/**
 * messages.js
 * كل نصوص البوت — ARAB | عرب
 * النخلة 🌴 بدل الشنطة الوردية
 */

// ── ثوابت البراند ──────────────────────────────────────────
const BRAND        = 'ARAB | عرب';
const BRAND_EMOJI  = '🌴';
const BESTSELLER   = 'الأخلاص الملكي الجامبو';

// ── أسعار التحويل (ثابتة — صرف مايو 2026) ──────────────────
// قاعدة الحساب: 1 KWD
const FX = {
  KWD: { rate: 1,      symbol: 'KWD', name: 'دينار كويتي'   },
  SAR: { rate: 12.19,  symbol: 'SAR', name: 'ريال سعودي'    },
  AED: { rate: 11.93,  symbol: 'AED', name: 'درهم إماراتي'  },
  BHD: { rate: 1.23,   symbol: 'BHD', name: 'دينار بحريني'  },
  OMR: { rate: 1.25,   symbol: 'OMR', name: 'ريال عماني'    },
  QAR: { rate: 11.85,  symbol: 'QAR', name: 'ريال قطري'     },
  GBP: { rate: 2.56,   symbol: 'GBP', name: 'جنيه إسترليني' },
  USD: { rate: 3.25,   symbol: 'USD', name: 'دولار أمريكي'  }
};

/**
 * تحديد العملة بناءً على مفتاح دولة الهاتف
 * jid مثال: 96597008126@s.whatsapp.net
 */
function currencyForJid(jid) {
  const num = String(jid || '').replace(/\D/g, '');
  if (num.startsWith('965')) return 'KWD';  // الكويت
  if (num.startsWith('966')) return 'SAR';  // السعودية
  if (num.startsWith('971')) return 'AED';  // الإمارات
  if (num.startsWith('973')) return 'BHD';  // البحرين
  if (num.startsWith('968')) return 'OMR';  // عُمان
  if (num.startsWith('974')) return 'QAR';  // قطر
  if (num.startsWith('44'))  return 'GBP';  // بريطانيا
  return 'USD';                              // كل الدول الأخرى
}

/**
 * تحويل سعر من KWD إلى عملة المستخدم
 * @param {number|string} kwdPrice
 * @param {string} currency   رمز العملة
 * @returns {string}  السعر المحوّل مع الرمز
 */
function convertPrice(kwdPrice, currency) {
  const fx    = FX[currency] || FX.USD;
  const converted = (parseFloat(kwdPrice) * fx.rate).toFixed(3);
  // أزل الصفر الثالث عند الضرورة
  const clean = parseFloat(converted).toFixed(currency === 'KWD' ? 3 : 2);
  return `${clean} ${fx.symbol}`;
}

// ────────────────────────────────────────────────────────────

const messages = {
  ar: {
    welcome:
      `${BRAND_EMOJI} *أهلاً وسهلاً في ${BRAND}!*\n\n` +
      `اختر لغتك / Choose your language:\n\n` +
      `1️⃣ العربية\n2️⃣ English`,

    mainMenu: () =>
      `${BRAND_EMOJI} *${BRAND}*\n\n📋 *القائمة الرئيسية:*\n\n` +
      `1️⃣  متابعة طلب 📦\n` +
      `2️⃣  تسوّق المنتجات 🌴\n` +
      `3️⃣  منتجاتنا وصورها 🖼️\n` +
      `4️⃣  التواصل مع الدعم 💬\n\n` +
      `_أرسل رقم الخيار_`,

    askOrderNumber: `📦 *متابعة الطلب*\n\nأرسل رقم طلبك\nمثال: #1001`,
    orderNotFound:  `❌ لم نجد طلباً بهذا الرقم.\n\nتأكد من الرقم وحاول مجدداً، أو اضغط *0* للرجوع للقائمة.`,

    orderStatus: (order) => {
      const statusMap = {
        unfulfilled: '⏳ قيد التجهيز',
        fulfilled:   '🚚 تم الشحن',
        partial:     '🔄 شحن جزئي',
        pending:     '⏳ قيد المراجعة',
        restocked:   '🔄 تم الإرجاع',
        cancelled:   '❌ ملغي'
      };
      const status   = statusMap[order.fulfillment_status] || '⏳ قيد المعالجة';
      const tracking = order.fulfillment_status === 'fulfilled' && order.fulfillments?.[0]?.tracking_url
        ? `\n\n🔗 *تتبع الشحنة:*\n${order.fulfillments[0].tracking_url}` : '';

      // موعد التوصيل المتوقع (للطلبات غير المشحونة)
      let delivery = '';
      if (order.fulfillment_status === 'unfulfilled') {
        const eta = order.estimated_delivery_at
          || order.shipping_lines?.[0]?.estimated_delivery_at
          || null;
        if (eta) {
          const d = new Date(eta).toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
          delivery = `\n📅 *موعد التوصيل المتوقع:* ${d}`;
        }
      }

      return `📦 *تفاصيل الطلب ${order.name}*\n\n` +
        `📌 الحالة: ${status}\n` +
        `💰 المجموع: ${order.total_price} ${order.currency}\n` +
        `📅 تاريخ الطلب: ${new Date(order.created_at).toLocaleDateString('ar-SA')}` +
        `${delivery}${tracking}\n\n` +
        `أرسل *0* للرجوع للقائمة`;
    },

    loadingProducts: `⏳ جاري تحميل المنتجات...`,
    noProducts:      `😔 لا توجد منتجات متاحة حالياً.\n\nأرسل *0* للرجوع للقائمة.`,

    addedToCart:     (title) => `✅ تم إضافة *${title}* للطلب`,
    askQuantity:     `كم كمية تريد؟ (أرسل رقم)`,
    invalidQuantity: `❌ أرسل رقم صحيح فقط`,

    emptyCart: `🌴 سلتك فارغة!\n\nأرسل *3* لتصفح المنتجات أو *0* للرجوع للقائمة`,

    checkoutLink: (url, total, currency) =>
      `🎉 *طلبك جاهز!*\n\n💰 المجموع: *${total} ${currency}*\n\n` +
      `👇 اضغط الرابط لإتمام الدفع:\n${url}\n\n_الرابط صالح لمدة 24 ساعة_`,
    checkoutError: `❌ حدث خطأ في إنشاء الطلب. حاول مجدداً أو تواصل مع الدعم.`,

    support: `💬 *التواصل مع الدعم*\n\nأرسل استفسارك وسنردّ عليك قريباً.\n\nأرسل *0* للرجوع للقائمة`,

    // إشعار الأدمن — يحتوي رقم جوال العميل
    supportNotification: (customerPhone, message) =>
      `🆘 *${BRAND} — طلب دعم جديد*\n\n` +
      `📱 جوال العميل: *${customerPhone}*\n` +
      `💬 الرسالة: ${message}`,

    orderConfirmation: (order) =>
      `${BRAND_EMOJI} *${BRAND}*\n\n✅ *تأكيد الطلب*\n\nشكراً على طلبك! 🎉\n\n` +
      `📦 رقم الطلب: *${order.name}*\n` +
      `💰 المجموع: *${order.total_price} ${order.currency}*\n\n` +
      `سيصلك إشعار عند شحن طلبك.`,

    orderShipped: (order) =>
      `${BRAND_EMOJI} *${BRAND}*\n\n🚚 *تم شحن طلبك!*\n\n` +
      `📦 رقم الطلب: *${order.name}*\n` +
      `${order.trackingUrl ? `\n🔗 *تتبع الشحنة:*\n${order.trackingUrl}` : ''}\n\n` +
      `متوقع الوصول خلال 2-5 أيام عمل.`,

    abandonedCart: (items) => {
      const list = items.map(i => `• ${i.title}`).join('\n');
      return `🌴 *${BRAND}*\n\nنسيت شيئاً؟ سلتك تنتظرك:\n${list}\n\n` +
        `أرسل *2* لإتمام طلبك أو *0* للقائمة`;
    },

    bestseller: `🌴 *أكثر منتجاتنا مبيعاً:* ${BESTSELLER} ⭐`,

    invalidOption: `❓ خيار غير صحيح. أرسل رقم من القائمة أو *0* للرجوع.`,
    backToMenu:    `↩️ رجوع للقائمة الرئيسية...`,
    error:         `⚠️ حدث خطأ. حاول مجدداً أو أرسل *0* للرجوع للقائمة.`
  },

  en: {
    welcome:
      `${BRAND_EMOJI} *Welcome to ${BRAND}!*\n\n` +
      `Choose your language / اختر لغتك:\n\n` +
      `1️⃣ العربية\n2️⃣ English`,

    mainMenu: () =>
      `${BRAND_EMOJI} *${BRAND}*\n\n📋 *Main Menu:*\n\n` +
      `1️⃣  Track Order 📦\n` +
      `2️⃣  Shop Products 🌴\n` +
      `3️⃣  Products & Photos 🖼️\n` +
      `4️⃣  Contact Support 💬\n\n` +
      `_Send the option number_`,

    askOrderNumber: `📦 *Track Your Order*\n\nPlease send your order number\nExample: #1001`,
    orderNotFound:  `❌ No order found with this number.\n\nPlease check and try again, or send *0* to go back.`,

    orderStatus: (order) => {
      const statusMap = {
        unfulfilled: '⏳ Processing',
        fulfilled:   '🚚 Shipped',
        partial:     '🔄 Partially Shipped',
        pending:     '⏳ Pending'
      };
      const status   = statusMap[order.fulfillment_status] || '⏳ Processing';
      const tracking = order.fulfillment_status === 'fulfilled' && order.fulfillments?.[0]?.tracking_url
        ? `\n\n🔗 *Track Shipment:*\n${order.fulfillments[0].tracking_url}` : '';

      let delivery = '';
      if (order.fulfillment_status === 'unfulfilled') {
        const eta = order.estimated_delivery_at
          || order.shipping_lines?.[0]?.estimated_delivery_at
          || null;
        if (eta) {
          const d = new Date(eta).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
          delivery = `\n📅 *Expected Delivery:* ${d}`;
        }
      }

      return `📦 *Order ${order.name} Details*\n\n` +
        `📌 Status: ${status}\n` +
        `💰 Total: ${order.total_price} ${order.currency}\n` +
        `📅 Date: ${new Date(order.created_at).toLocaleDateString('en-US')}` +
        `${delivery}${tracking}\n\n` +
        `Send *0* to go back`;
    },

    loadingProducts: `⏳ Loading products...`,
    noProducts:      `😔 No products available right now.\n\nSend *0* to go back.`,

    addedToCart:     (title) => `✅ *${title}* added to your order`,
    askQuantity:     `How many would you like? (send a number)`,
    invalidQuantity: `❌ Please send a valid number`,

    emptyCart: `🌴 Your cart is empty!\n\nSend *3* to browse products or *0* for main menu`,

    checkoutLink: (url, total, currency) =>
      `🎉 *Your order is ready!*\n\n💰 Total: *${total} ${currency}*\n\n` +
      `👇 Click to complete payment:\n${url}\n\n_Link valid for 24 hours_`,
    checkoutError: `❌ Error creating order. Please try again or contact support.`,

    support: `💬 *Contact Support*\n\nSend your message and we'll get back to you shortly.\n\nSend *0* to go back`,

    supportNotification: (customerPhone, message) =>
      `🆘 *${BRAND} — New Support Request*\n\n` +
      `📱 Customer Phone: *${customerPhone}*\n` +
      `💬 Message: ${message}`,

    orderConfirmation: (order) =>
      `${BRAND_EMOJI} *${BRAND}*\n\n✅ *Order Confirmed*\n\nThank you for your order! 🎉\n\n` +
      `📦 Order: *${order.name}*\n` +
      `💰 Total: *${order.total_price} ${order.currency}*\n\n` +
      `We'll notify you when your order ships.`,

    orderShipped: (order) =>
      `${BRAND_EMOJI} *${BRAND}*\n\n🚚 *Your Order Has Shipped!*\n\n` +
      `📦 Order: *${order.name}*\n` +
      `${order.trackingUrl ? `\n🔗 *Track Shipment:*\n${order.trackingUrl}` : ''}\n\n` +
      `Expected delivery: 2-5 business days.`,

    abandonedCart: (items) => {
      const list = items.map(i => `• ${i.title}`).join('\n');
      return `🌴 *${BRAND}*\n\nYou left something behind:\n${list}\n\n` +
        `Send *2* to complete your order or *0* for main menu`;
    },

    bestseller: `🌴 *Our Best Seller:* Jumbo Premium Royal Khalas Dates ⭐`,

    invalidOption: `❓ Invalid option. Send a number from the menu or *0* to go back.`,
    backToMenu:    `↩️ Back to main menu...`,
    error:         `⚠️ An error occurred. Please try again or send *0* to go back.`
  }
};

function msg(lang, key, ...args) {
  const m = messages[lang] || messages.ar;
  const t = m[key];
  if (!t) return `[Missing: ${key}]`;
  return typeof t === 'function' ? t(...args) : t;
}

module.exports = { msg, messages, currencyForJid, convertPrice, FX };
