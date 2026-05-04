/**
 * bot.js
 * إعداد وتشغيل WhatsApp client باستخدام Baileys
 * يدعم الأصوات على الـ Polls (ضغط بدون كتابة)
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom }              = require('@hapi/boom');
const qrcode                = require('qrcode-terminal');
const pino                  = require('pino');
const fs                    = require('fs');
const { handleMessage }     = require('./flows');
const { setClient }         = require('./webhooks');
const { handlePollVote }    = require('./polls');
const sessions              = require('./sessions');

let sock = null;
let qrCurrentString = null;

function getQRString() { return qrCurrentString; }

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./.baileys_auth');

  let version = [2, 3000, 1015901307];
  try {
    const result = await fetchLatestBaileysVersion();
    version = result.version;
    console.log(`📱 WhatsApp version: ${version.join('.')}`);
  } catch {
    console.log('⚠️ Could not fetch latest WA version, using fallback');
  }

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['ARAB Bot', 'Chrome', '1.0.0'],
    getMessage: async () => undefined,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // ─── حالة الاتصال ───
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCurrentString = qr;
      console.log('\n📱 امسح هذا الـ QR بتطبيق واتساب:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nWhatsApp > ⋮ > Linked Devices > Link a Device\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : null;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('🔐 تم تسجيل الخروج. حذف الـ session...');
        try { fs.rmSync('./.baileys_auth', { recursive: true, force: true }); } catch {}
      }

      console.log(`🔄 Reconnecting in 3s... (status: ${statusCode})`);
      setTimeout(() => startBot(), 3000);
    }

    if (connection === 'open') {
      qrCurrentString = null;
      console.log('✅ WhatsApp Bot is ready!');
      setClient(sock);
      setInterval(() => sessions.cleanup(), 6 * 60 * 60 * 1000);
    }
  });

  // ─── استقبال الرسائل العادية ───
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const message = messages[0];
    if (!message?.message) return;
    if (message.key.fromMe) return;
    if (message.key.remoteJid?.endsWith('@g.us')) return;
    if (message.key.remoteJid === 'status@broadcast') return;

    const jid        = message.key.remoteJid;
    const msgContent = message.message;
    let text         = '';
    let msgType      = 'chat';

    if (msgContent.conversation) {
      text = msgContent.conversation;
    } else if (msgContent.extendedTextMessage?.text) {
      text = msgContent.extendedTextMessage.text;
    }

    text = text.trim();
    if (!text) return;

    console.log(`📩 [${new Date().toLocaleTimeString()}] ${jid.split('@')[0]}: ${text.slice(0, 50)}`);

    try {
      await handleMessage(sock, jid, text, msgType);
    } catch (err) {
      console.error(`❌ Error handling message from ${jid}:`, err.message);
      await sock.sendMessage(jid, { text: '⚠️ حدث خطأ. أرسل *0* للقائمة الرئيسية.' });
    }
  });

  // ─── ✅ استقبال أصوات الـ Poll (الضغط على الخيار) ───
  sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
      if (!update.pollUpdates?.length) continue;

      try {
        const result = handlePollVote(key, update.pollUpdates);
        if (!result) continue;

        const { jid, optionId } = result;
        console.log(`🗳️ [Poll Vote] ${jid.split('@')[0]}: اختار → ${optionId}`);

        await handleMessage(sock, jid, optionId, 'poll_response');
      } catch (err) {
        console.error('❌ Poll update error:', err.message);
      }
    }
  });

  return sock;
}

function getClient() {
  return sock;
}

module.exports = { startBot, getQRString };
