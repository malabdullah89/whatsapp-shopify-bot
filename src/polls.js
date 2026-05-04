/**
 * polls.js
 * إدارة الـ Polls (استطلاعات) كبديل للأزرار التفاعلية
 * الـ Poll ميزة رسمية من واتساب - لا تحتاج تحقق Meta
 *
 * الفكرة:
 *  - البوت يرسل poll بالخيارات
 *  - العميل يضغط على خيار (بدون كتابة)
 *  - نستقبل الصوت ونعالجه
 */

const { getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys');

// Map لتخزين الـ polls المُرسلة: pollMsgId → بيانات الـ poll
const pollStore = new Map();

/**
 * تخزين poll أُرسل حديثاً
 * @param {object} sentMsg - الرسالة المُرجعة من sock.sendMessage
 * @param {string[]} optionIds - ['1','2','3'] (يتوافق مع الـ flows)
 * @param {string} jid - رقم المستخدم
 */
function storePoll(sentMsg, optionIds, jid) {
  const pollId = sentMsg?.key?.id;
  if (!pollId) return;

  pollStore.set(pollId, {
    sentMsg,
    optionIds,
    jid,
    createdAt: Date.now()
  });

  // نظّف الـ polls القديمة (أكثر من ساعتين)
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, data] of pollStore.entries()) {
    if (data.createdAt < cutoff) pollStore.delete(id);
  }
}

/**
 * معالجة تحديث صوت في poll
 * @param {object} key - مفتاح الرسالة المُحدَّثة (key.id = pollMsgId)
 * @param {Array}  pollUpdates - مصفوفة التحديثات من Baileys
 * @returns {{ jid, optionId } | null}
 */
function handlePollVote(key, pollUpdates) {
  const pollId = key?.id;
  if (!pollId) return null;

  const pollData = pollStore.get(pollId);
  if (!pollData) return null;

  try {
    // فكّ تشفير الأصوات باستخدام أداة Baileys الرسمية
    const votes = getAggregateVotesInPollMessage({
      message:     pollData.sentMsg.message,
      key:         pollData.sentMsg.key,
      pollUpdates
    });

    // أعد أول خيار وجد له صوت
    for (let i = 0; i < votes.length; i++) {
      if (votes[i].voters?.length > 0) {
        return {
          jid:      pollData.jid,
          optionId: pollData.optionIds[i]
        };
      }
    }
  } catch (e) {
    console.error('⚠️ Poll vote decode error:', e.message);
  }

  return null;
}

module.exports = { storePoll, handlePollVote };
