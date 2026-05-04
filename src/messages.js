/**
 * messages.js
 * كل نصوص البوت بالعربية والإنجليزية
 */

const messages = {
  ar: {
    // ترحيب واختيار لغة
    welcome: `👋 *أهلاً وسهلاً!*\n\nاختر لغتك / Choose your language:\n\n1️⃣ العربية\n2️⃣ English`,

    // القائمة الرئيسية
    mainMenu: (storeName) =>
      `🏪 *${storeName || 'متجرنا'}*\n\n📋 *القائمة الرئيسية:*\n\n1️⃣ متابعة طلب\n2️⃣ طلب جديد\n3️⃣ المنتجات والصور\n4️⃣ التواصل مع الدعم\n\n_أرسل رقم الخيار_`,

    // تتبع الطلب
    askOrderNumber: `📦 *متابعة الطلب*\n\nأرسل رقم طلبك\nمثال: #1001`,
    orderNotFound: `❌ لم نجد طلباً بهذا الرقم.\n\nتأكد من الرقم وحاول مجدداً، أو اضغط *0* للرجوع للقائمة.`,
    orderStatus: (order) => {
      const statusMap = {
        pending: '⏳ قيد المراجعة',
        confirmed: '✅ مؤكد',
        processing: '🔄 جاري التجهيز',
        shipped: '🚚 تم الشحن',
        delivered: '✅ تم التوصيل',
        cancelled: '❌ ملغي',
        unfulfilled: '⏳ قيد التجهيز',
        fulfilled: '🚚 تم الشحن',
        partial: '🔄 شحن جزئي',
        restocked: '🔄 تم الإرجاع'
      };
      const status = statusMap[order.fulfillment_status] || statusMap[order.financial_status] || '⏳ قيد المعالجة';
      const tracking = order.fulfillment_status === 'fulfilled' && order.fulfillments?.[0]?.tracking_url
        ? `\n\n🔗 *تتبع الشحنة:*\n${order.fulfillments[0].tracking_url}` : '';
      return `📦 *تفاصيل الطلب ${order.name}*\n\n📌 الحالة: ${status}\n💰 المجموع: ${order.total_price} ${order.currency}\n📅 تاريخ الطلب: ${new Date(order.created_at).toLocaleDateString('ar-SA')}${tracking}\n\nأرسل *0* للرجوع للقائمة`;
    },

    // المنتجات
    loadingProducts: `⏳ جاري تحميل المنتجات...`,
    noProducts: `😔 لا توجد منتجات متاحة حالياً.\n\nأرسل *0* للرجوع للقائمة.`,
    productsHeader: (count) => `🛍️ *منتجاتنا (${count} منتج)*\n\n`,
    productItem: (index, product) =>
      `${index}️⃣ *${product.title}*\n💰 ${product.price} ${product.currency}\n`,
    productsFooter: `\nأرسل رقم المنتج لعرض تفاصيله وإضافته للطلب\nأو أرسل *0* للرجوع`,

    // تفاصيل منتج
    productDetails: (product) =>
      `🛍️ *${product.title}*\n\n${product.description ? product.description + '\n\n' : ''}💰 السعر: *${product.price} ${product.currency}*\n📦 المتوفر: ${product.available ? '✅ متوفر' : '❌ نفد المخزون'}\n\nأرسل *1* لإضافته للطلب\nأو *0* للرجوع`,

    // السلة
    addedToCart: (title) => `✅ تم إضافة *${title}* للطلب`,
    askQuantity: `كم كمية تريد؟ (أرسل رقم)`,
    invalidQuantity: `❌ أرسل رقم صحيح فقط`,
    cartSummary: (items, total, currency) => {
      let summary = `🛒 *ملخص طلبك:*\n\n`;
      items.forEach((item, i) => {
        summary += `${i + 1}. ${item.productTitle} × ${item.quantity} = ${(parseFloat(item.price) * item.quantity).toFixed(2)} ${currency}\n`;
      });
      summary += `\n💰 *الإجمالي: ${total} ${currency}*\n\n1️⃣ إتمام الطلب والدفع\n2️⃣ إضافة منتج آخر\n3️⃣ مسح السلة\n0️⃣ رجوع للقائمة`;
      return summary;
    },
    emptyCart: `🛒 سلتك فارغة!\n\nأرسل *3* لتصفح المنتجات أو *0* للرجوع للقائمة`,

    // رابط الدفع
    checkoutLink: (url, total, currency) =>
      `🎉 *طلبك جاهز!*\n\n💰 المجموع: *${total} ${currency}*\n\n👇 اضغط الرابط لإتمام الدفع:\n${url}\n\n_الرابط صالح لمدة 24 ساعة_`,
    checkoutError: `❌ حدث خطأ في إنشاء الطلب. حاول مجدداً أو تواصل مع الدعم.`,

    // الدعم
    support: `💬 *التواصل مع الدعم*\n\nسيتواصل معك أحد ممثلي خدمة العملاء قريباً.\n\nيمكنك أيضاً:\n📧 إرسال استفسارك وسنرد خلال ساعة\n\nأرسل *0* للرجوع للقائمة`,
    supportNotification: (phone, message) =>
      `🆘 *طلب دعم جديد*\n\nالرقم: ${phone}\nالرسالة: ${message}`,

    // إشعارات Shopify التلقائية
    orderConfirmation: (order) =>
      `✅ *تأكيد الطلب*\n\nشكراً على طلبك! 🎉\n\n📦 رقم الطلب: *${order.name}*\n💰 المجموع: *${order.total_price} ${order.currency}*\n\nسيصلك إشعار عند شحن طلبك.`,

    orderShipped: (order) =>
      `🚚 *تم شحن طلبك!*\n\n📦 رقم الطلب: *${order.name}*\n${order.trackingUrl ? `\n🔗 *تتبع الشحنة:*\n${order.trackingUrl}` : ''}\n\nمتوقع الوصول خلال 2-5 أيام عمل.`,

    abandonedCart: (items) => {
      const itemList = items.map(i => `• ${i.title}`).join('\n');
      return `🛒 *نسيت شيئاً؟*\n\nلا تزال هذه المنتجات تنتظرك:\n${itemList}\n\nأرسل *2* لإتمام طلبك أو *0* للقائمة الرئيسية`;
    },

    // أخرى
    invalidOption: `❓ خيار غير صحيح. أرسل رقم من القائمة أو *0* للرجوع.`,
    backToMenu: `↩️ رجوع للقائمة الرئيسية...`,
    error: `⚠️ حدث خطأ. حاول مجدداً أو أرسل *0* للرجوع للقائمة.`
  },

  en: {
    welcome: `👋 *Welcome!*\n\nChoose your language / اختر لغتك:\n\n1️⃣ العربية\n2️⃣ English`,

    mainMenu: (storeName) =>
      `🏪 *${storeName || 'Our Store'}*\n\n📋 *Main Menu:*\n\n1️⃣ Track Order\n2️⃣ New Order\n3️⃣ Products & Photos\n4️⃣ Contact Support\n\n_Send the option number_`,

    askOrderNumber: `📦 *Track Your Order*\n\nPlease send your order number\nExample: #1001`,
    orderNotFound: `❌ No order found with this number.\n\nPlease check and try again, or send *0* to go back.`,
    orderStatus: (order) => {
      const statusMap = {
        unfulfilled: '⏳ Processing',
        fulfilled: '🚚 Shipped',
        partial: '🔄 Partially Shipped',
        pending: '⏳ Pending',
        confirmed: '✅ Confirmed'
      };
      const status = statusMap[order.fulfillment_status] || '⏳ Processing';
      const tracking = order.fulfillment_status === 'fulfilled' && order.fulfillments?.[0]?.tracking_url
        ? `\n\n🔗 *Track Shipment:*\n${order.fulfillments[0].tracking_url}` : '';
      return `📦 *Order ${order.name} Details*\n\n📌 Status: ${status}\n💰 Total: ${order.total_price} ${order.currency}\n📅 Date: ${new Date(order.created_at).toLocaleDateString('en-US')}${tracking}\n\nSend *0* to go back`;
    },

    loadingProducts: `⏳ Loading products...`,
    noProducts: `😔 No products available right now.\n\nSend *0* to go back.`,
    productsHeader: (count) => `🛍️ *Our Products (${count} items)*\n\n`,
    productItem: (index, product) =>
      `${index}️⃣ *${product.title}*\n💰 ${product.price} ${product.currency}\n`,
    productsFooter: `\nSend a product number to view details\nOr send *0* to go back`,

    productDetails: (product) =>
      `🛍️ *${product.title}*\n\n${product.description ? product.description + '\n\n' : ''}💰 Price: *${product.price} ${product.currency}*\n📦 Stock: ${product.available ? '✅ Available' : '❌ Out of Stock'}\n\nSend *1* to add to order\nOr *0* to go back`,

    addedToCart: (title) => `✅ *${title}* added to your order`,
    askQuantity: `How many would you like? (send a number)`,
    invalidQuantity: `❌ Please send a valid number`,
    cartSummary: (items, total, currency) => {
      let summary = `🛒 *Your Order Summary:*\n\n`;
      items.forEach((item, i) => {
        summary += `${i + 1}. ${item.productTitle} × ${item.quantity} = ${(parseFloat(item.price) * item.quantity).toFixed(2)} ${currency}\n`;
      });
      summary += `\n💰 *Total: ${total} ${currency}*\n\n1️⃣ Checkout & Pay\n2️⃣ Add another product\n3️⃣ Clear cart\n0️⃣ Back to menu`;
      return summary;
    },
    emptyCart: `🛒 Your cart is empty!\n\nSend *3* to browse products or *0* for main menu`,

    checkoutLink: (url, total, currency) =>
      `🎉 *Your order is ready!*\n\n💰 Total: *${total} ${currency}*\n\n👇 Click to complete payment:\n${url}\n\n_Link valid for 24 hours_`,
    checkoutError: `❌ Error creating order. Please try again or contact support.`,

    support: `💬 *Contact Support*\n\nA customer service representative will contact you shortly.\n\nYou can also:\n📧 Send your inquiry and we'll reply within an hour\n\nSend *0* to go back`,
    supportNotification: (phone, message) =>
      `🆘 *New Support Request*\n\nPhone: ${phone}\nMessage: ${message}`,

    orderConfirmation: (order) =>
      `✅ *Order Confirmed*\n\nThank you for your order! 🎉\n\n📦 Order: *${order.name}*\n💰 Total: *${order.total_price} ${order.currency}*\n\nWe'll notify you when your order ships.`,

    orderShipped: (order) =>
      `🚚 *Your Order Has Shipped!*\n\n📦 Order: *${order.name}*\n${order.trackingUrl ? `\n🔗 *Track Shipment:*\n${order.trackingUrl}` : ''}\n\nExpected delivery: 2-5 business days.`,

    abandonedCart: (items) => {
      const itemList = items.map(i => `• ${i.title}`).join('\n');
      return `🛒 *You left something behind!*\n\nThese items are waiting for you:\n${itemList}\n\nSend *2* to complete your order or *0* for main menu`;
    },

    invalidOption: `❓ Invalid option. Send a number from the menu or *0* to go back.`,
    backToMenu: `↩️ Back to main menu...`,
    error: `⚠️ An error occurred. Please try again or send *0* to go back.`
  }
};

/**
 * جلب رسالة بناءً على اللغة
 * @param {string} lang - 'ar' أو 'en'
 * @param {string} key - مفتاح الرسالة
 * @param  {...any} args - متغيرات الرسالة
 */
function msg(lang, key, ...args) {
  const langMessages = messages[lang] || messages.ar;
  const template = langMessages[key];
  if (!template) return `[Missing message: ${key}]`;
  return typeof template === 'function' ? template(...args) : template;
}

module.exports = { msg, messages };
