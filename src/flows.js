/**
 * flows.js — منطق المحادثة
 * قوائم نصية منسقة + صور منتجات + ثنائي اللغة AR/EN
 */

const sessions = require('./sessions');
const { msg }  = require('./messages');
const shopify  = require('./shopify');

const STORE_NAME  = process.env.STORE_NAME  || 'متجرنا';
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP;

// ─────────────────────────────────────────────────────────────
// نقطة الدخول
// ─────────────────────────────────────────────────────────────
async function handleMessage(sock, jid, text, messageType = 'chat') {
  const input   = text.trim();
  const session = sessions.get(jid);
  const lang    = session.lang || 'ar';

  if (input === '0' && session.state !== 'INIT') {
    sessions.update(jid, { state: 'MAIN_MENU' });
    await sendMainMenu(sock, jid, lang);
    return;
  }

  switch (session.state) {
    case 'INIT':           await handleInit(sock, jid, input, session);          break;
    case 'MAIN_MENU':      await handleMainMenu(sock, jid, input, session);      break;
    case 'TRACK_ORDER':    await handleTrackOrder(sock, jid, input, session);    break;
    case 'CATALOG':        await handleCatalog(sock, jid, input, session);       break;
    case 'PRODUCT_DETAIL': await handleProductDetail(sock, jid, input, session); break;
    case 'ASK_QUANTITY':   await handleAskQuantity(sock, jid, input, session);   break;
    case 'CART_REVIEW':    await handleCartReview(sock, jid, input, session);    break;
    case 'SUPPORT':        await handleSupport(sock, jid, input, session);       break;
    default:
      sessions.update(jid, { state: 'INIT' });
      await sendWelcome(sock, jid);
  }
}

// ─────────────────────────────────────────────────────────────
// INIT — اختيار اللغة
// ─────────────────────────────────────────────────────────────
async function handleInit(sock, jid, input, session) {
  if (input === '1') {
    sessions.update(jid, { lang: 'ar', state: 'MAIN_MENU' });
    await sendMainMenu(sock, jid, 'ar');
  } else if (input === '2') {
    sessions.update(jid, { lang: 'en', state: 'MAIN_MENU' });
    await sendMainMenu(sock, jid, 'en');
  } else {
    await sendWelcome(sock, jid);
  }
}

async function sendWelcome(sock, jid) {
  await send(sock, jid,
    `👋 *أهلاً وسهلاً! / Welcome!*\n\n` +
    `اختر لغتك / Choose your language:\n\n` +
    `1️⃣  العربية 🇰🇼\n` +
    `2️⃣  English 🇬🇧`
  );
}

// ─────────────────────────────────────────────────────────────
// القائمة الرئيسية
// ─────────────────────────────────────────────────────────────
async function sendMainMenu(sock, jid, lang) {
  const text = lang === 'ar'
    ? `🏪 *${STORE_NAME}*\n\n📋 *القائمة الرئيسية:*\n\n` +
      `1️⃣  متابعة طلب 📦\n` +
      `2️⃣  تسوّق المنتجات 🛍️\n` +
      `3️⃣  منتجاتنا وصورها 🖼️\n` +
      `4️⃣  التواصل مع الدعم 💬\n\n` +
      `_أرسل رقم الخيار_`
    : `🏪 *${STORE_NAME}*\n\n📋 *Main Menu:*\n\n` +
      `1️⃣  Track Order 📦\n` +
      `2️⃣  Shop Products 🛍️\n` +
      `3️⃣  Products & Photos 🖼️\n` +
      `4️⃣  Contact Support 💬\n\n` +
      `_Send the option number_`;
  await send(sock, jid, text);
}

async function handleMainMenu(sock, jid, input, session) {
  const lang = session.lang;
  switch (input) {
    case '1':
      sessions.update(jid, { state: 'TRACK_ORDER' });
      await send(sock, jid, msg(lang, 'askOrderNumber'));
      break;
    case '2':
    case '3':
      sessions.update(jid, { state: 'CATALOG' });
      await showCatalog(sock, jid, lang);
      break;
    case '4':
      sessions.update(jid, { state: 'SUPPORT' });
      await send(sock, jid, msg(lang, 'support'));
      break;
    default:
      await send(sock, jid, msg(lang, 'invalidOption'));
      await sendMainMenu(sock, jid, lang);
  }
}

// ─────────────────────────────────────────────────────────────
// TRACK_ORDER
// ─────────────────────────────────────────────────────────────
async function handleTrackOrder(sock, jid, input, session) {
  const lang = session.lang;
  if (!/^#?\d+$/.test(input)) {
    await send(sock, jid, msg(lang, 'invalidOption'));
    return;
  }
  await send(sock, jid, lang === 'ar' ? '🔍 جاري البحث...' : '🔍 Searching...');
  const order = await shopify.getOrderByNumber(input);
  if (!order) {
    await send(sock, jid, msg(lang, 'orderNotFound'));
  } else {
    await send(sock, jid, msg(lang, 'orderStatus', order));
  }
}

// ─────────────────────────────────────────────────────────────
// CATALOG — كل منتج برسالة + صورة منفصلة
// ─────────────────────────────────────────────────────────────
async function showCatalog(sock, jid, lang) {
  const session = sessions.get(jid);

  if (session.products && session.products.length > 0) {
    await sendProductMenu(sock, jid, lang, session.products);
    return;
  }

  await send(sock, jid, msg(lang, 'loadingProducts'));
  const products = await shopify.getProducts(lang);

  if (!products.length) {
    await send(sock, jid, msg(lang, 'noProducts'));
    sessions.update(jid, { state: 'MAIN_MENU' });
    return;
  }

  sessions.update(jid, { products });

  const header = lang === 'ar'
    ? `🛍️ *منتجاتنا — ${products.length} منتج*`
    : `🛍️ *Our Products — ${products.length} items*`;
  await send(sock, jid, header);
  await sleep(400);

  for (let i = 0; i < products.length; i++) {
    const p       = products[i];
    const caption = buildCaption(lang, i + 1, p);
    if (p.imageUrl) {
      try {
        await sock.sendMessage(jid, { image: { url: p.imageUrl }, caption });
        await sleep(700);
        continue;
      } catch (e) {
        console.error(`⚠️ Image error [${p.title}]:`, e.message);
      }
    }
    await send(sock, jid, caption);
    await sleep(500);
  }

  await sendProductMenu(sock, jid, lang, products);
}

function buildCaption(lang, num, p) {
  const avail = p.available
    ? (lang === 'ar' ? '✅ متوفر' : '✅ In Stock')
    : (lang === 'ar' ? '❌ نفد المخزون' : '❌ Out of Stock');
  const desc = p.description ? '\n\n' + p.description.slice(0, 200) : '';
  return `${numEmoji(num)} *${p.title}*\n💰 *${p.price} ${p.currency}*\n📦 ${avail}${desc}`;
}

async function sendProductMenu(sock, jid, lang, products) {
  let text = lang === 'ar' ? `📋 *اختر منتجاً:*\n\n` : `📋 *Choose a product:*\n\n`;
  products.forEach((p, i) => {
    text += `${numEmoji(i + 1)}  *${p.title}* — ${p.price} ${p.currency} ${p.available ? '✅' : '❌'}\n`;
  });
  text += lang === 'ar'
    ? `\n_أرسل رقم المنتج أو *0* للرجوع_`
    : `\n_Send product number or *0* to go back_`;
  await send(sock, jid, text);
}

async function handleCatalog(sock, jid, input, session) {
  const lang     = session.lang;
  const products = session.products || [];
  const index    = parseInt(input) - 1;

  if (isNaN(index) || index < 0 || index >= products.length) {
    await send(sock, jid, msg(lang, 'invalidOption'));
    await sendProductMenu(sock, jid, lang, products);
    return;
  }

  const product = products[index];
  sessions.update(jid, { state: 'PRODUCT_DETAIL', selectedProduct: product });
  await sendProductDetail(sock, jid, lang, product);
}

// ─────────────────────────────────────────────────────────────
// PRODUCT_DETAIL
// ─────────────────────────────────────────────────────────────
async function sendProductDetail(sock, jid, lang, product) {
  const avail = product.available
    ? (lang === 'ar' ? '✅ متوفر' : '✅ In Stock')
    : (lang === 'ar' ? '❌ نفد المخزون' : '❌ Out of Stock');
  const desc = product.description ? product.description.slice(0, 200) + '\n\n' : '';
  const text = lang === 'ar'
    ? `🛍️ *${product.title}*\n\n${desc}💰 السعر: *${product.price} ${product.currency}*\n📦 ${avail}\n\n` +
      `1️⃣  إضافة للطلب 🛒\n0️⃣  رجوع ↩️`
    : `🛍️ *${product.title}*\n\n${desc}💰 Price: *${product.price} ${product.currency}*\n📦 ${avail}\n\n` +
      `1️⃣  Add to Order 🛒\n0️⃣  Back ↩️`;
  await send(sock, jid, text);
}

async function handleProductDetail(sock, jid, input, session) {
  const lang    = session.lang;
  const product = session.selectedProduct;

  if (!product) {
    sessions.update(jid, { state: 'MAIN_MENU' });
    await sendMainMenu(sock, jid, lang);
    return;
  }

  if (input === '1') {
    if (!product.available) {
      await send(sock, jid, lang === 'ar' ? '❌ هذا المنتج غير متوفر حالياً' : '❌ Out of stock');
      return;
    }
    sessions.update(jid, { state: 'ASK_QUANTITY' });
    await send(sock, jid, msg(lang, 'askQuantity'));
  } else {
    await send(sock, jid, msg(lang, 'invalidOption'));
    await sendProductDetail(sock, jid, lang, product);
  }
}

// ─────────────────────────────────────────────────────────────
// ASK_QUANTITY
// ─────────────────────────────────────────────────────────────
async function handleAskQuantity(sock, jid, input, session) {
  const lang     = session.lang;
  const quantity = parseInt(input);

  if (isNaN(quantity) || quantity < 1 || quantity > 99) {
    await send(sock, jid, msg(lang, 'invalidQuantity'));
    return;
  }

  const product = session.selectedProduct;
  sessions.addToCart(jid, product, product.variantId, quantity);
  await send(sock, jid, msg(lang, 'addedToCart', product.title));
  await sleep(300);

  sessions.update(jid, { state: 'CART_REVIEW' });
  await showCartSummary(sock, jid, lang);
}

// ─────────────────────────────────────────────────────────────
// CART_REVIEW
// ─────────────────────────────────────────────────────────────
async function showCartSummary(sock, jid, lang) {
  const session  = sessions.get(jid);
  const cart     = session.cart;
  const currency = process.env.STORE_CURRENCY || 'KWD';

  if (!cart.length) {
    await send(sock, jid, msg(lang, 'emptyCart'));
    sessions.update(jid, { state: 'MAIN_MENU' });
    return;
  }

  const total = cart.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0).toFixed(2);

  let text = lang === 'ar' ? '🛒 *ملخص طلبك:*\n\n' : '🛒 *Your Order Summary:*\n\n';
  cart.forEach((item, i) => {
    text += `${i + 1}. ${item.productTitle} × ${item.quantity} = ${(parseFloat(item.price) * item.quantity).toFixed(2)} ${currency}\n`;
  });
  text += `\n💰 *${lang === 'ar' ? 'الإجمالي' : 'Total'}: ${total} ${currency}*\n\n`;
  text += lang === 'ar'
    ? `1️⃣  إتمام الطلب والدفع 💳\n2️⃣  إضافة منتج آخر ➕\n3️⃣  مسح السلة 🗑️\n0️⃣  رجوع للقائمة`
    : `1️⃣  Checkout & Pay 💳\n2️⃣  Add another product ➕\n3️⃣  Clear cart 🗑️\n0️⃣  Back to menu`;

  await send(sock, jid, text);
}

async function handleCartReview(sock, jid, input, session) {
  const lang = session.lang;
  switch (input) {
    case '1':
      await processCheckout(sock, jid, lang, session);
      break;
    case '2':
      sessions.update(jid, { state: 'CATALOG' });
      await showCatalog(sock, jid, lang);
      break;
    case '3':
      sessions.clearCart(jid);
      sessions.update(jid, { state: 'MAIN_MENU' });
      await send(sock, jid, lang === 'ar' ? '✅ تم مسح السلة' : '✅ Cart cleared');
      await sleep(300);
      await sendMainMenu(sock, jid, lang);
      break;
    default:
      await send(sock, jid, msg(lang, 'invalidOption'));
      await showCartSummary(sock, jid, lang);
  }
}

async function processCheckout(sock, jid, lang, session) {
  await send(sock, jid, lang === 'ar' ? '⏳ جاري إنشاء طلبك...' : '⏳ Creating your order...');
  const result = await shopify.createDraftOrder(session.cart, jid);
  if (!result) {
    await send(sock, jid, msg(lang, 'checkoutError'));
    return;
  }
  sessions.clearCart(jid);
  sessions.cancelAbandonedCart(jid);
  sessions.update(jid, { state: 'MAIN_MENU' });
  await send(sock, jid, msg(lang, 'checkoutLink', result.checkoutUrl, result.total, result.currency));
}

// ─────────────────────────────────────────────────────────────
// SUPPORT
// ─────────────────────────────────────────────────────────────
async function handleSupport(sock, jid, input, session) {
  const lang = session.lang;
  if (ADMIN_PHONE && input !== '0') {
    try {
      await sock.sendMessage(formatPhone(ADMIN_PHONE), {
        text: msg(lang, 'supportNotification', jid, input)
      });
    } catch (e) {
      console.error('⚠️ Could not notify admin:', e.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// إشعارات Shopify
// ─────────────────────────────────────────────────────────────
async function sendOrderConfirmation(sock, phone, order) {
  await send(sock, formatPhone(phone), msg(detectLang(phone), 'orderConfirmation', order));
}

async function sendOrderShipped(sock, phone, order) {
  await send(sock, formatPhone(phone), msg(detectLang(phone), 'orderShipped', order));
}

async function sendAbandonedCartReminder(sock, phone, items) {
  await send(sock, formatPhone(phone), msg(detectLang(phone), 'abandonedCart', items));
}

// ─────────────────────────────────────────────────────────────
// أدوات مساعدة
// ─────────────────────────────────────────────────────────────
async function send(sock, jid, text) {
  try {
    await sock.sendMessage(jid, { text });
  } catch (err) {
    console.error(`❌ Failed to send to ${jid}:`, err.message);
  }
}

function formatPhone(phone) {
  const clean = String(phone).replace(/\D/g, '');
  if (String(phone).includes('@s.whatsapp.net')) return phone;
  if (String(phone).includes('@c.us')) return clean.replace('@c.us', '') + '@s.whatsapp.net';
  return `${clean}@s.whatsapp.net`;
}

function detectLang(jid) {
  try { return sessions.get(formatPhone(jid)).lang || 'ar'; }
  catch { return 'ar'; }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function numEmoji(n) {
  return ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][n - 1] || `${n}.`;
}

module.exports = {
  handleMessage,
  sendOrderConfirmation,
  sendOrderShipped,
  sendAbandonedCartReminder
};
