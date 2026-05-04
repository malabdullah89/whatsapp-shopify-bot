/**
 * shopify.js
 * كل العمليات مع Shopify API
 * - جلب المنتجات
 * - إنشاء Draft Order + رابط الدفع
 * - تتبع الطلب
 */

const axios = require('axios');

const SHOPIFY_STORE   = process.env.SHOPIFY_STORE_DOMAIN;   // yourstore.myshopify.com
const SHOPIFY_TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;    // Admin API Token
const CURRENCY        = process.env.STORE_CURRENCY || 'SAR';
const API_VERSION     = '2024-01';

const shopifyAPI = axios.create({
  baseURL: `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_TOKEN,
    'Content-Type': 'application/json'
  }
});

// ─────────────────────────────────────────
// المنتجات
// ─────────────────────────────────────────

/**
 * جلب كل المنتجات المتاحة
 * @param {string|null} locale - 'ar' لجلب الترجمة العربية إن وجدت
 * @returns {Array} قائمة المنتجات منسقة
 */
async function getProducts(locale = null) {
  try {
    const { data } = await shopifyAPI.get('/products.json', {
      params: { status: 'active', limit: 50, fields: 'id,title,body_html,images,variants,status' }
    });

    const products = data.products.map(product => {
      const variant   = product.variants[0];
      const available = product.variants.some(v => v.inventory_quantity > 0 || v.inventory_policy === 'continue');
      return {
        id:          product.id,
        title:       product.title,
        description: stripHtml(product.body_html),
        price:       parseFloat(variant.price).toFixed(2),
        currency:    CURRENCY,
        variantId:   variant.id,
        imageUrl:    product.images[0]?.src || null,
        available
      };
    });

    // جلب الأسماء العربية إن طُلب وكانت ترجمات مضافة في Shopify
    if (locale === 'ar' && products.length > 0) {
      await enrichWithTranslations(products, 'ar');
    }

    return products;
  } catch (err) {
    console.error('❌ Shopify getProducts error:', err.response?.data || err.message);
    return [];
  }
}

/**
 * إثراء المنتجات بالترجمات (مثلاً العربية) عبر GraphQL
 * Silent fail — لو ما توفرت الترجمات، يبقى الاسم الأصلي
 */
async function enrichWithTranslations(products, locale) {
  try {
    const ids = products.map(p => `"gid://shopify/Product/${p.id}"`).join(',');
    const query = `{
      nodes(ids: [${ids}]) {
        ... on Product {
          id
          translations(locale: "${locale}") { key value }
        }
      }
    }`;

    const { data } = await shopifyAPI.post('/graphql.json', { query });
    const nodes = data?.data?.nodes || [];

    nodes.forEach(node => {
      if (!node?.translations?.length) return;
      const numId   = parseInt(node.id.split('/').pop());
      const product = products.find(p => p.id === numId);
      if (!product) return;

      const t = (key) => node.translations.find(t => t.key === key)?.value;
      if (t('title'))     product.title       = t('title');
      if (t('body_html')) product.description = stripHtml(t('body_html'));
    });
  } catch (e) {
    // لا ترجمات متاحة — يُستخدم الاسم الافتراضي
    console.log('ℹ️ Arabic translations unavailable (add read_translations scope to enable)');
  }
}

/**
 * جلب منتج واحد بالـ ID
 */
async function getProduct(productId) {
  try {
    const { data } = await shopifyAPI.get(`/products/${productId}.json`);
    const product = data.product;
    const variant  = product.variants[0];
    const available = product.variants.some(v => v.inventory_quantity > 0 || v.inventory_policy === 'continue');
    return {
      id:          product.id,
      title:       product.title,
      description: stripHtml(product.body_html),
      price:       parseFloat(variant.price).toFixed(2),
      currency:    CURRENCY,
      variantId:   variant.id,
      imageUrl:    product.images[0]?.src || null,
      available
    };
  } catch (err) {
    console.error('❌ Shopify getProduct error:', err.response?.data || err.message);
    return null;
  }
}

// ─────────────────────────────────────────
// الطلبات
// ─────────────────────────────────────────

/**
 * إنشاء Draft Order وإرجاع رابط الدفع
 * @param {Array} cartItems - عناصر السلة
 * @param {string} customerPhone - رقم هاتف العميل
 * @returns {{ checkoutUrl, total, currency }}
 */
async function createDraftOrder(cartItems, customerPhone) {
  try {
    const lineItems = cartItems.map(item => ({
      variant_id: item.variantId,
      quantity:   item.quantity
    }));

    const payload = {
      draft_order: {
        line_items: lineItems,
        // ربط العميل بالرقم لو موجود في Shopify
        ...(customerPhone && {
          shipping_address: { phone: customerPhone }
        }),
        note: `طلب عبر واتساب - ${customerPhone}`,
        tags: 'whatsapp-bot'
      }
    };

    const { data } = await shopifyAPI.post('/draft_orders.json', payload);
    const draft    = data.draft_order;

    return {
      checkoutUrl: draft.invoice_url,
      total:       parseFloat(draft.total_price).toFixed(2),
      currency:    draft.currency || CURRENCY,
      draftId:     draft.id
    };
  } catch (err) {
    console.error('❌ Shopify createDraftOrder error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * البحث عن طلب برقمه (#1001) أو الرقم الفعلي (1001)
 */
async function getOrderByNumber(orderInput) {
  try {
    // إزالة # إذا كانت موجودة
    const orderNumber = String(orderInput).replace('#', '').trim();

    const { data } = await shopifyAPI.get('/orders.json', {
      params: {
        name:   `#${orderNumber}`,
        status: 'any',
        limit:  1,
        fields: 'id,name,financial_status,fulfillment_status,total_price,currency,created_at,fulfillments,line_items'
      }
    });

    if (data.orders && data.orders.length > 0) {
      return data.orders[0];
    }
    return null;
  } catch (err) {
    console.error('❌ Shopify getOrderByNumber error:', err.response?.data || err.message);
    return null;
  }
}

/**
 * البحث عن طلبات برقم الهاتف (لإشعارات Shopify)
 */
async function getOrdersByPhone(phone) {
  try {
    // تنظيف رقم الهاتف
    const cleanPhone = phone.replace(/\D/g, '');

    const { data } = await shopifyAPI.get('/orders.json', {
      params: {
        status: 'any',
        limit:  250,
        fields: 'id,name,phone,shipping_address,financial_status,fulfillment_status,total_price,currency,created_at,fulfillments'
      }
    });

    return (data.orders || []).filter(order => {
      const orderPhone = (order.phone || order.shipping_address?.phone || '').replace(/\D/g, '');
      return orderPhone && cleanPhone.endsWith(orderPhone.slice(-9));
    });
  } catch (err) {
    console.error('❌ Shopify getOrdersByPhone error:', err.response?.data || err.message);
    return [];
  }
}

// ─────────────────────────────────────────
// أدوات مساعدة
// ─────────────────────────────────────────

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .slice(0, 200); // أقصر النص لو كان طويلاً
}

module.exports = {
  getProducts,
  getProduct,
  createDraftOrder,
  getOrderByNumber,
  getOrdersByPhone
};
