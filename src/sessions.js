/**
 * sessions.js
 * إدارة حالة كل مستخدم في المحادثة
 * يحفظ: اللغة، الحالة الحالية، السلة، آخر نشاط
 */

class SessionManager {
  constructor() {
    this.sessions = new Map();
    // لتتبع السلال المتروكة: checkoutToken -> { phone, items, timer }
    this.abandonedCarts = new Map();
  }

  /**
   * جلب جلسة المستخدم أو إنشاء جلسة جديدة
   */
  get(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, this._newSession());
    }
    return this.sessions.get(phone);
  }

  /**
   * تحديث بيانات الجلسة
   */
  update(phone, data) {
    const session = this.get(phone);
    Object.assign(session, data, { lastActivity: Date.now() });
    this.sessions.set(phone, session);
  }

  /**
   * إضافة منتج للسلة
   */
  addToCart(phone, product, variantId, quantity = 1) {
    const session = this.get(phone);
    const existing = session.cart.find(i => i.variantId === variantId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      session.cart.push({
        variantId,
        productTitle: product.title,
        variantTitle: product.variantTitle,
        price: product.price,
        quantity
      });
    }
    this.update(phone, { cart: session.cart });
  }

  /**
   * مسح السلة
   */
  clearCart(phone) {
    this.update(phone, { cart: [] });
  }

  /**
   * إعادة تعيين الجلسة للبداية
   */
  reset(phone) {
    this.sessions.set(phone, this._newSession());
  }

  /**
   * تسجيل سلة متروكة وإرسال تذكير بعد ساعة
   */
  trackAbandonedCart(phone, checkoutToken, items, sendReminderFn) {
    // إلغاء أي timer سابق لنفس الرقم
    if (this.abandonedCarts.has(phone)) {
      clearTimeout(this.abandonedCarts.get(phone).timer);
    }

    const timer = setTimeout(async () => {
      // تحقق إذا العميل لم يكمل الطلب
      if (this.abandonedCarts.has(phone)) {
        await sendReminderFn(phone, items);
        this.abandonedCarts.delete(phone);
      }
    }, 60 * 60 * 1000); // ساعة واحدة

    this.abandonedCarts.set(phone, { checkoutToken, items, timer });
  }

  /**
   * إلغاء تتبع السلة (لما يكمل الطلب)
   */
  cancelAbandonedCart(phone) {
    if (this.abandonedCarts.has(phone)) {
      clearTimeout(this.abandonedCarts.get(phone).timer);
      this.abandonedCarts.delete(phone);
    }
  }

  _newSession() {
    return {
      state: 'INIT',       // الحالة الحالية في المحادثة
      lang: null,          // 'ar' أو 'en'
      cart: [],            // المنتجات المختارة
      products: [],        // قائمة المنتجات المعروضة حالياً
      selectedProduct: null,
      lastActivity: Date.now()
    };
  }

  /**
   * تنظيف الجلسات القديمة (أكثر من 24 ساعة بدون نشاط)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    for (const [phone, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(phone);
      }
    }
  }
}

// Singleton - نفس الكائن في كل المشروع
module.exports = new SessionManager();
