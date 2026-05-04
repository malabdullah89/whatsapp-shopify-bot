/**
 * setup.js — يجيب Shopify Access Token تلقائياً
 *
 * الاستخدام:  node setup.js
 *
 * ما يفعله:
 *  1. يشغّل سيرفر محلي على port 3000
 *  2. يفتح المتصفح مباشرةً على صفحة OAuth
 *  3. بعد موافقتك على صفحة Shopify يستقبل الـ code ويبادله بـ token
 *  4. يكتب الـ token تلقائياً في ملف .env
 *  5. يشغّل البوت مباشرةً
 */

const http       = require('http');
const https      = require('https');
const fs         = require('fs');
const path       = require('path');
const { exec }   = require('child_process');
const crypto     = require('crypto');
const url        = require('url');

// ─── الإعدادات ─────────────────────────────────────────────────────
const SHOPIFY_STORE   = 'hsespd-dv.myshopify.com';
const CLIENT_ID       = 'fde141259aa0ae9bc018c7d9701351a1';
const CLIENT_SECRET   = process.env.SHOPIFY_CLIENT_SECRET || '';
const REDIRECT_URI    = 'http://localhost:3000/callback';
const SCOPES          = 'read_products,write_draft_orders,read_draft_orders,read_orders,read_customers';
const PORT            = 3000;
const ENV_FILE        = path.join(__dirname, '.env');
// ────────────────────────────────────────────────────────────────────

const state = crypto.randomBytes(16).toString('hex');

const authUrl = `https://${SHOPIFY_STORE}/admin/oauth/authorize`
  + `?client_id=${CLIENT_ID}`
  + `&scope=${encodeURIComponent(SCOPES)}`
  + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
  + `&state=${state}`;

// ─── فتح المتصفح ───────────────────────────────────────────────────
function openBrowser(link) {
  const cmd = process.platform === 'darwin' ? `open "${link}"`
            : process.platform === 'win32'  ? `start "" "${link}"`
            : `xdg-open "${link}"`;
  exec(cmd);
}

// ─── تبادل الكود بالـ Token ─────────────────────────────────────────
function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    });

    const options = {
      hostname: SHOPIFY_STORE,
      path:     '/admin/oauth/access_token',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error(`Shopify error: ${data}`));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── كتابة/تحديث .env ──────────────────────────────────────────────
function writeEnv(token) {
  let content = '';

  // اقرأ الملف الحالي إن وجد
  if (fs.existsSync(ENV_FILE)) {
    content = fs.readFileSync(ENV_FILE, 'utf8');
  }

  const line = `SHOPIFY_ADMIN_TOKEN=${token}`;

  if (content.includes('SHOPIFY_ADMIN_TOKEN=')) {
    // حدّث السطر الموجود
    content = content.replace(/^SHOPIFY_ADMIN_TOKEN=.*/m, line);
  } else {
    // أضف في البداية
    content = line + '\n' + content;
  }

  fs.writeFileSync(ENV_FILE, content, 'utf8');
  console.log(`\n✅ تم حفظ الـ Token في .env`);
  console.log(`   ${line.slice(0, 40)}...`);
}

// ─── تشغيل البوت ───────────────────────────────────────────────────
function startBot() {
  console.log('\n🚀 جاري تشغيل البوت...\n');
  const child = require('child_process').spawn(
    'node', ['src/index.js'],
    { cwd: __dirname, stdio: 'inherit' }
  );
  child.on('error', err => console.error('❌ فشل تشغيل البوت:', err.message));
  child.on('exit', code => {
    if (code !== 0) console.error(`❌ البوت أُغلق بكود: ${code}`);
  });
}

// ─── السيرفر المحلي ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/callback') {
    const { code, state: returnedState, error } = parsed.query;

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>❌ تم رفض الإذن: ${error}</h2><p>أغلق هذه الصفحة وحاول مجدداً.</p>`);
      return;
    }

    if (returnedState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h2>❌ State mismatch — محاولة تزوير محتملة</h2>`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html dir="rtl">
      <head><meta charset="utf-8"><title>تم التفعيل</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fff4}
      .box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
      h1{color:#22c55e}p{color:#555}</style></head>
      <body><div class="box">
        <h1>✅ تم التفعيل بنجاح!</h1>
        <p>تم ربط المتجر بالبوت. يمكنك إغلاق هذه الصفحة.</p>
        <p style="font-size:12px;color:#aaa">WhatsApp Shopify Bot</p>
      </div></body></html>
    `);

    try {
      console.log('\n🔄 جاري استخراج الـ Token...');
      const token = await exchangeCode(code);
      writeEnv(token);
      server.close();
      startBot();
    } catch (err) {
      console.error('❌ فشل استخراج الـ Token:', err.message);
      process.exit(1);
    }

  } else if (parsed.pathname === '/') {
    res.writeHead(302, { Location: authUrl });
    res.end();
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║         WhatsApp Shopify Bot — إعداد أولي            ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 المتجر : ${SHOPIFY_STORE}`);
  console.log(`🔑 Client : ${CLIENT_ID.slice(0, 8)}...`);
  console.log('');
  console.log('🌐 جاري فتح المتصفح...');
  console.log(`   (أو افتح يدوياً: http://localhost:${PORT})`);
  console.log('');

  // افتح المتصفح بعد ثانية
  setTimeout(() => openBrowser(`http://localhost:${PORT}`), 1000);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ البورت ${PORT} مستخدم بالفعل.`);
    console.error('   أغلق أي برنامج آخر يستخدم هذا البورت ثم حاول مجدداً.\n');
  } else {
    console.error('❌ خطأ في السيرفر:', err.message);
  }
  process.exit(1);
});
