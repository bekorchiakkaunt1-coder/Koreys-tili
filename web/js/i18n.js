// All UI strings, Uzbek Latin (§12.17).
var T = {
  loading: 'Yuklanmoqda…',
  title: 'Hangang',
  examIn: function (n) { return 'TOPIK I gacha: ' + n + ' kun'; },
  due: 'Takrorlash',
  fresh: 'Yangi',
  inbox: 'Inbox',
  start: function (n) { return n ? 'Boshlash (' + n + ')' : 'Bugunga karta yo‘q'; },
  add: 'So‘z qo‘shish',
  pending: function (n) { return n + ' ta javob hali yuborilmagan'; },
  latency: function (p50, p95, n) { return 'API: p50 ' + p50 + ' ms · p95 ' + p95 + ' ms (n=' + n + ')'; },
  show: 'Javobni ko‘rsatish',
  grades: ['Yana', 'Qiyin', 'Yaxshi', 'Oson'],
  left: function (d, n) { return 'Takror: ' + d + ' · Yangi: ' + n; },
  done: 'Bugungi kartalar tugadi 🎉',
  doneSub: 'Javoblar saqlandi.',
  later: function (label) { return 'Keyingi o‘rganish kartasi ' + label + 'dan keyin.'; },
  home: 'Bosh sahifa',
  retry: 'Qayta urinish',
  addHint: 'Har qatorda bitta: 사과 - olma',
  addBtn: 'Qo‘shish',
  added: function (r) {
    var out = ['✅ ' + r.added + ' ta so‘z qo‘shildi.'];
    if (r.dup.length) out.push('⏭ Bor edi: ' + r.dup.join(', '));
    if (r.bad.length) out.push('⚠️ Tushunilmadi: ' + r.bad.join(' | '));
    return out.join('\n');
  },
  noTelegram: 'Bu sahifa Telegram ichida (bot menyusi orqali) ochilishi kerak.',
  errors: {
    AUTH_EXPIRED: 'Sessiya eskirdi — Mini App’ni yopib, qayta oching.',
    AUTH_INVALID: 'Avtorizatsiya xatosi — Mini App’ni bot menyusidan oching.',
    FORBIDDEN: 'Ruxsat yo‘q.',
    NETWORK: 'Internet yo‘q yoki server javob bermadi. Keyinroq urinib ko‘ring.',
  },
};
