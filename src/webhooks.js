/**
 * webhooks.js
 * Express server يستقبل أحداث Shopify ويرسل إشعارات واتساب
 *
 * الأحداث المدعومة:
 *   POST /webhook/order-created    → تأكيد الطلب
 *   POST /webhook/order-fulfilled  → إشعار الشحن
 *   POST /webhook/checkout-created → تتبع السلة المتروكة
 */

const express    = require('express');
const crypto     = require('crypto');
const QRCode     = require('qrcode');
const sessions   = require('./sessions');
const { sendOrderConfirmation, sendOrderShipped, sendAbandonedCartReminder } = require('./flows');
let getQRStringFn = null;
function setQRStringGetter(fn) { getQRStringFn = fn; }

const WEBHOOK_SECRET  = process.env.SHOPIFY_WEBHOOK_SECRET;
const ABANDONED_DELAY = parseInt(process.env.ABANDONED_CART_DELAY_MS) || 60 * 60 * 1000; // ساعة

let whatsappClient = null; // يُحقن من bot.js

function setClient(client) {
  whatsappClient = client;
}

// ─────────────────────────────────────────
// التحقق من صحة Webhook
// ─────────────────────────────────────────
function verifyWebhook(req) {
  if (!WEBHOOK_SECRET) return true; // تخطي التحقق في بيئة التطوير
  const hmac    = req.headers['x-shopify-hmac-sha256'];
  const body    = req.rawBody;
  if (!hmac || !body) return false;
  const digest  = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

// ─────────────────────────────────────────
// استخراج رقم الهاتف من الطلب
// ─────────────────────────────────────────
function extractPhone(order) {
  const rawPhone =
    order.phone ||
    order.billing_address?.phone ||
    order.shipping_address?.phone ||
    order.customer?.phone ||
    null;

  if (!rawPhone) return null;

  // تنظيف الرقم
  let clean = rawPhone.replace(/\D/g, '');

  // إضافة كود الدولة لو ما فيه (افتراضي الكويت)
  if (clean.length === 8) clean = `965${clean}`;
  if (clean.length === 9) clean = `966${clean}`;
  if (clean.length === 10 && clean.startsWith('0')) clean = `965${clean.slice(1)}`;

  return `${clean}@s.whatsapp.net`;
}

// ─────────────────────────────────────────
// بدء الـ Server
// ─────────────────────────────────────────
function startWebhookServer() {
  const app  = express();
  const PORT = process.env.PORT || 3000;

  // Middleware لحفظ الـ raw body للتحقق
  app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf; }
  }));

  // ─── Health check ───
  app.get('/', (req, res) => {
    res.json({ status: 'running', bot: whatsappClient ? 'connected' : 'connecting' });
  });

  // ─── QR Code Page ───
  app.get('/qr', async (req, res) => {
    const qrStr = getQRStringFn ? getQRStringFn() : null;
    if (!qrStr) {
      const connected = whatsappClient ? true : false;
      const msg = connected ? 'WhatsApp متصل بنجاح!' : 'QR not ready yet. Refresh in 5 seconds...';
      return res.send('<html><head><meta charset="utf-8"><meta http-equiv="refresh" content="5"><style>body{background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:1.5em;text-align:center}</style></head><body>' + msg + '</body></html>');
    }
    try {
      const dataURL = await QRCode.toDataURL(qrStr, { width: 400, margin: 2 });
      const html = [
        '<!DOCTYPE html><html><head>',
        '<meta charset="utf-8">',
        '<meta http-equiv="refresh" content="20">',
        '<title>WhatsApp QR</title>',
        '<style>body{background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;}',
        'img{border:10px solid white;border-radius:12px;width:320px;height:320px;}',
        'p{color:#fff;margin-top:20px;font-size:1.1em;text-align:center;}',
        'small{color:#aaa;}</style></head><body>',
        '<img src="' + dataURL + '" alt="WhatsApp QR Code"/>',
        '<p>&#128241; افتح واتساب &larr; الأجهزة المرتبطة &larr; ربط جهاز<br>',
        '<small>يتجدد تلقائياً كل 20 ثانية</small></p>',
        '</body></html>'
      ].join('');
      res.send(html);
    } catch(e) {
      res.status(500).send('Error generating QR: ' + e.message);
    }
  });

  // ─── تأكيد الطلب ───
  app.post('/webhook/order-created', async (req, res) => {
    if (!verifyWebhook(req)) return res.status(401).send('Unauthorized');
    res.status(200).send('OK'); // نرد بسرعة لـ Shopify

    try {
      const order = req.body;
      const phone = extractPhone(order);

      console.log(`📦 New order: ${order.name} | Phone: ${phone || 'N/A'}`);

      if (phone && whatsappClient) {
        await sendOrderConfirmation(whatsappClient, phone, order);
        // إلغاء تتبع السلة المتروكة لو أكمل الطلب
        sessions.cancelAbandonedCart(phone);
      }
    } catch (err) {
      console.error('❌ Webhook order-created error:', err.message);
    }
  });

  // ─── إشعار الشحن ───
  app.post('/webhook/order-fulfilled', async (req, res) => {
    if (!verifyWebhook(req)) return res.status(401).send('Unauthorized');
    res.status(200).send('OK');

    try {
      const order = req.body;
      const phone = extractPhone(order);

      console.log(`🚚 Order shipped: ${order.name} | Phone: ${phone || 'N/A'}`);

      // جلب رابط التتبع
      const trackingUrl = order.fulfillments?.[0]?.tracking_url || null;

      if (phone && whatsappClient) {
        await sendOrderShipped(whatsappClient, phone, { ...order, trackingUrl });
      }
    } catch (err) {
      console.error('❌ Webhook order-fulfilled error:', err.message);
    }
  });

  // ─── السلة المتروكة ───
  app.post('/webhook/checkout-created', async (req, res) => {
    if (!verifyWebhook(req)) return res.status(401).send('Unauthorized');
    res.status(200).send('OK');

    try {
      const checkout = req.body;

      // تجاهل السلال الفارغة
      if (!checkout.line_items || checkout.line_items.length === 0) return;

      const phone = extractPhone({ phone: checkout.phone, shipping_address: checkout.shipping_address });

      console.log(`🛒 Checkout created | Phone: ${phone || 'N/A'} | Items: ${checkout.line_items.length}`);

      if (phone && whatsappClient) {
        const items = checkout.line_items.map(i => ({ title: i.title, quantity: i.quantity }));

        // تسجيل السلة المتروكة مع timer
        sessions.trackAbandonedCart(
          phone,
          checkout.token,
          items,
          async (p, cartItems) => {
            await sendAbandonedCartReminder(whatsappClient, p, cartItems);
          }
        );
      }
    } catch (err) {
      console.error('❌ Webhook checkout-created error:', err.message);
    }
  });

  // ─── إلغاء السلة المتروكة (لما يكمل الطلب) ───
  app.post('/webhook/checkout-completed', async (req, res) => {
    if (!verifyWebhook(req)) return res.status(401).send('Unauthorized');
    res.status(200).send('OK');

    try {
      const checkout = req.body;
      const phone    = extractPhone({ phone: checkout.phone, shipping_address: checkout.shipping_address });
      if (phone) sessions.cancelAbandonedCart(phone);
    } catch (err) {
      console.error('❌ Webhook checkout-completed error:', err.message);
    }
  });

  app.listen(PORT, () => {
    console.log(`🌐 Webhook server running on port ${PORT}`);
    console.log(`   → POST /webhook/order-created`);
    console.log(`   → POST /webhook/order-fulfilled`);
    console.log(`   → POST /webhook/checkout-created`);
  });

  return app;
}

module.exports = { startWebhookServer, setClient, setQRStringGetter };
