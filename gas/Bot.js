/**
 * Chat side (D-13): capture, add syntax, notifications. No LLM calls here (§8.2).
 */
const Bot = (function () {
  const SITUATIONS = ['주문', '결제', '길', '불만', '잡담', '기타'];
  const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;
  const ADD_LINE = /^(.+?)\s+[-–—]\s+(.+)$/;

  const TXT = {
    start:
      'Hangang Protocol 🇰🇷\n\n' +
      '• So‘z qo‘shish (bir nechta qator mumkin):\n사과 - olma\n책 - kitob\n\n' +
      '• Boshqa har qanday matn yoki ovozli xabar → inbox (keyin triage).\n' +
      '• Mashq → pastdagi menyu tugmasi (Mini App).',
    notOwner: function (id) {
      return 'OWNER_ID hali o‘rnatilmagan.\nSizning id: ' + id + '\nApps Script → Project Settings → Script Properties → OWNER_ID = ' + id;
    },
    captured: '📥 Saqlandi. Vaziyat?',
  };

  /**
   * Add syntax `ko - uz`, one pair per line. Add mode only if the first non-empty line matches.
   * @param {string} text
   * @return {?{items:Array<{ko:string, uz:string}>, bad:Array<string>}}
   */
  function parseAdd(text) {
    const lines = String(text || '').normalize('NFC').split(/\r?\n/)
      .map(function (l) { return l.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean);
    if (!lines.length || !isAddLine(lines[0])) return null;
    const items = [];
    const bad = [];
    const seen = {};
    lines.forEach(function (l) {
      if (!isAddLine(l)) { bad.push(l); return; }
      const m = l.match(ADD_LINE);
      const ko = m[1].trim();
      if (seen[ko]) return;
      seen[ko] = true;
      items.push({ ko: ko, uz: m[2].trim() });
    });
    return { items: items, bad: bad };
  }

  function isAddLine(l) {
    const m = l.match(ADD_LINE);
    return !!m && HANGUL.test(m[1]) && !HANGUL.test(m[2]);
  }

  /** @param {Object} update Telegram Update */
  function handleUpdate(update) {
    const owner = prop_(PROP.OWNER_ID);
    if (update.message) {
      const msg = update.message;
      if (msg.chat.type !== 'private') return;
      if (!owner) {
        if (/^\/start\b/.test(msg.text || '')) Telegram.sendMessage(msg.chat.id, TXT.notOwner(msg.from.id));
        return;
      }
      if (String(msg.from.id) !== String(owner)) return; // D-04: single user, ignore everyone else
      onMessage(msg);
    } else if (update.callback_query) {
      const cq = update.callback_query;
      if (!owner || String(cq.from.id) !== String(owner)) return;
      onCallback(cq);
    }
  }

  function onMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    if (/^\/(start|help)\b/.test(text)) {
      Telegram.sendMessage(chatId, TXT.start);
      return;
    }
    if (text.charAt(0) === '/') {
      Telegram.sendMessage(chatId, 'Noma’lum buyruq. /help');
      return;
    }
    const add = text ? parseAdd(text) : null;
    if (add) {
      Telegram.sendMessage(chatId, addNotes(add));
      return;
    }
    if (text || msg.voice) capture(chatId, text, msg.voice ? msg.voice.file_id : '');
  }

  function addNotes(add) {
    const res = Notes.addBulk(add.items, 'manual');
    const out = ['✅ ' + res.added + ' ta so‘z qo‘shildi.'];
    if (res.dup.length) out.push('⏭ Bor edi (' + res.dup.length + '): ' + res.dup.join(', '));
    if (add.bad.length) out.push('⚠️ Tushunilmadi (' + add.bad.length + '): ' + add.bad.join(' | '));
    return out.join('\n');
  }

  function capture(chatId, text, voiceFileId) {
    const capId = newId_('i');
    Repo.append('inbox', [{ cap_id: capId, ts: Date.now(), text: text, voice_file_id: voiceFileId, situation: '', status: 'new' }]);
    Telegram.sendMessage(chatId, TXT.captured, { reply_markup: situationKeyboard(capId) });
  }

  function situationKeyboard(capId) {
    const btn = function (s, i) { return { text: s, callback_data: 'sit|' + capId + '|' + i }; };
    return { inline_keyboard: [SITUATIONS.slice(0, 3).map(btn), SITUATIONS.slice(3).map(function (s, i) { return btn(s, i + 3); })] };
  }

  function onCallback(cq) {
    const parts = String(cq.data || '').split('|');
    if (parts[0] === 'sit' && SITUATIONS[Number(parts[2])]) {
      const situation = SITUATIONS[Number(parts[2])];
      const row = Repo.findBy('inbox', 'cap_id', parts[1]);
      if (row) Repo.update('inbox', row._row, { situation: situation });
      if (cq.message) Telegram.editMessageText(cq.message.chat.id, cq.message.message_id, '📥 Saqlandi · ' + situation);
      Telegram.answerCallbackQuery(cq.id);
      return;
    }
    Telegram.answerCallbackQuery(cq.id);
  }

  return { handleUpdate: handleUpdate, parseAdd: parseAdd, addNotes: addNotes, SITUATIONS: SITUATIONS };
})();

/**
 * New FSRS card row from ts-fsrs createEmptyCard (vendor), timestamps as UTC ms.
 * elapsed_days is deliberately not stored (§6.1).
 */
function newCardRow_(cardId, noteId, kind, nowMs) {
  const c = HV.fsrs.createEmptyCard(new Date(nowMs));
  return {
    card_id: cardId, note_id: noteId, kind: kind, due: c.due.getTime(), stability: c.stability,
    difficulty: c.difficulty, state: c.state, reps: c.reps, lapses: c.lapses,
    learning_steps: c.learning_steps || 0, scheduled_days: c.scheduled_days, last_review: '',
    suspended: false, buried_until: '', is_leech: false,
  };
}
