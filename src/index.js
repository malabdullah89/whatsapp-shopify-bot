/**
 * index.js — نقطة بداية التطبيق
 */

require('dotenv').config();

const { startBot }           = require('./bot');
const { startWebhookServer } = require('./webhooks');

// التحقق من المتغيرات المطلوبة
const required = ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_TOKEN'];
const missing  = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
  console.error('   تأكد من ملف .env');
  process.exit(1);
}

async function main() {
  console.log('🚀 Starting WhatsApp Shopify Bot...');
  console.log(`   Store: ${process.env.SHOPIFY_STORE_DOMAIN}`);
  console.log(`   Currency: ${process.env.STORE_CURRENCY || 'SAR'}`);

  // بدء webhook server (يستقبل أحداث Shopify)
  startWebhookServer();

  // بدء WhatsApp bot
  await startBot();
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
