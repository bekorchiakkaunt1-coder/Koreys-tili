// All UI strings, Uzbek Latin (§12.17).
var T = {
  loading: 'Yuklanmoqda…',
  title: 'Hangang',
  examIn: function (n) { return 'TOPIK I gacha: ' + n + ' kun'; },
  due: 'Takrorlash',
  fresh: 'Yangi so‘z',
  inbox: 'Ishdagi gaplar',
  start: function (n) { return n ? 'Mashqni boshlash (' + n + ')' : 'Bugunga karta yo‘q ✓'; },
  tech: 'Texnik ma’lumot',
  add: 'So‘z qo‘shish',
  pending: function (n) { return n + ' ta javob hali yuborilmagan'; },
  latency: function (l) {
    return 'API: p50 ' + l.p50 + ' ms · p95 ' + l.p95 + ' ms' + (l.server ? ' (server p50 ' + l.server + ' ms)' : '') + ' · n=' + l.n;
  },
  syncing: '⟳ Yangilanmoqda…',
  offline: 'Server bilan bog‘lanib bo‘lmadi — oxirgi saqlangan holat ko‘rsatilmoqda.',
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
  notes: {
    title: 'Lug‘at',
    search: 'Qidirish: 사과, olma, apple yoki ㅅㄱ',
    count: function (n, total) { return n === total ? total + ' ta so‘z' : n + ' / ' + total + ' ta so‘z'; },
    more: function (n) { return 'yana ' + n + ' ta — qidiruvni aniqroq yozing'; },
    fresh: 'hali o‘rganilmagan',
    learning: 'o‘rganilmoqda',
    today: 'bugun takrorlanadi',
    inDays: function (d) { return d + ' kundan keyin'; },
    off: 'o‘chirilgan',
    uzPlaceholder: 'O‘zbekcha ma’nosi (o‘zingiz yozing)',
    save: 'Saqlash',
    saving: 'Saqlanmoqda…',
    disable: 'Kartani o‘chirish',
    enable: 'Kartani yoqish',
  },
  help: {
    title: 'Qanday ishlatiladi?',
    sections: [
      ['1. Har kuni: «Mashqni boshlash»',
        'Koreyscha so‘z chiqadi → ma’nosini eslashga harakat qiling → «Javobni ko‘rsatish» → o‘zingizni halol baholang:<br>' +
        '• <b>Yana</b> — eslay olmadim (1 daqiqada yana chiqadi)<br>• <b>Qiyin</b> — zo‘rg‘a esladim<br>' +
        '• <b>Yaxshi</b> — esladim<br>• <b>Oson</b> — darhol, o‘ylamasdan<br>' +
        'Tugma ostidagi vaqt — so‘z qachon yana chiqishi. Qachon takrorlashni ilova o‘zi hisoblaydi.'],
      ['2. Kuniga 12 ta yangi so‘z',
        'Avval o‘zingiz qo‘shgan so‘zlar, keyin lug‘atdagi (krdict) 초급 so‘zlar. Takrorlashlarni qoldirmang — ' +
        'eng kami <b>8 daqiqa mashq + 4 daqiqa tinglash</b> (minimal kun).'],
      ['3. So‘z qo‘shish',
        'Botga yoki «So‘z qo‘shish» ekraniga yozing, har qatorda bittadan:<br><span lang="ko">사과</span> - olma<br><span lang="ko">책</span> - kitob'],
      ['4. Ishdagi gaplar',
        'Mijoz aytgan gapni botga yozing yoki ovozli xabar yuboring → vaziyat tugmasini bosing (주문, 결제 …). ' +
        'Ular «Ishdagi gaplar»da yig‘iladi; keyinroq kartaga aylantiramiz.'],
      ['5. Lug‘at',
        'Barcha so‘zlar. Qidirish: koreyscha, o‘zbekcha, inglizcha yoki bosh harflar (ㅅㄱ → <span lang="ko">사과</span>). ' +
        'So‘zni bosing → o‘zbekcha ma’nosini yozing yoki kartani o‘chiring.'],
      ['6. Internet bo‘lmasa ham',
        'Javoblaringiz telefonda saqlanadi va internet qaytganda o‘zi yuboriladi. «⟳ Yangilanmoqda…» — fonda sinxronlash.'],
    ],
  },
  noTelegram: 'Bu sahifa Telegram ichida (bot menyusi orqali) ochilishi kerak.',
  errors: {
    AUTH_EXPIRED: 'Sessiya eskirdi — Mini App’ni yopib, qayta oching.',
    AUTH_INVALID: 'Avtorizatsiya xatosi — Mini App’ni bot menyusidan oching.',
    FORBIDDEN: 'Ruxsat yo‘q.',
    NETWORK: 'Internet yo‘q yoki server javob bermadi. Keyinroq urinib ko‘ring.',
  },
};
