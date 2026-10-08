/**
 * krdict (국립국어원 한국어기초사전) Open API import — Phase 1 (§6.3, §11).
 * Run importKrdict() from the editor; KRDICT_KEY lives in Script Properties.
 *
 * Request parameters (key, q, advanced=y, target, method, type1, level, sort, start, num,
 * translated, trans_lang) follow krdict.py 3.0.2's mapping to the raw API (secondary source;
 * official guide not reachable from the build env). The API has no "empty query" search, so
 * the import uses the known workaround q='.' searched in definitions (target=2): almost every
 * definition contains a period. UNVERIFIED until the first live run → see `logs`.
 * Licence: CC BY-SA, attribute "국립국어원 한국어기초사전"; krdict data stays in its own columns.
 */
const KRDICT_SEARCH_URL = 'https://krdict.korean.go.kr/api/search';
const KRDICT_SKIP_POS = ['접사', '어미'];

const Krdict = (function () {
  /** @return {string} query string; values URI-encoded */
  function query(params) {
    return Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  }

  function pageParams(key, page, transLang) {
    return {
      key: key, q: '.', advanced: 'y', target: 2, method: 'include', type1: 'word', level: 'level1',
      sort: 'popular', part: 'word', start: page, num: 100, translated: 'y', trans_lang: transLang,
    };
  }

  /**
   * Parses a search response with XmlService.
   * @return {{total:number, items:Array<Object>}|{error:{code:string, message:string}}}
   */
  function parse(xml) {
    const root = XmlService.parse(xml).getRootElement();
    if (root.getName() === 'error') {
      return { error: { code: root.getChildText('error_code'), message: root.getChildText('message') } };
    }
    const items = root.getChildren('item').map(function (it) {
      return {
        target_code: it.getChildText('target_code'),
        word: (it.getChildText('word') || '').trim(),
        sup_no: Number(it.getChildText('sup_no')) || 0,
        pronunciation: it.getChildText('pronunciation') || '',
        word_grade: it.getChildText('word_grade') || '',
        pos: it.getChildText('pos') || '',
        senses: it.getChildren('sense').map(function (s) {
          return {
            definition: s.getChildText('definition') || '',
            translations: s.getChildren('translation').map(function (t) {
              return { word: (t.getChildText('trans_word') || '').trim(), dfn: (t.getChildText('trans_dfn') || '').trim() };
            }),
          };
        }),
      };
    });
    return { total: Number(root.getChildText('total')) || 0, items: items };
  }

  /** Short gloss from the first two senses: translated headword, else the start of the translated definition. */
  function gloss(item) {
    const out = [];
    item.senses.slice(0, 2).forEach(function (s) {
      const t = s.translations[0];
      if (!t) return;
      const g = t.word || (t.dfn.length > 60 ? t.dfn.slice(0, 57) + '…' : t.dfn);
      if (g && out.indexOf(g) < 0) out.push(g);
    });
    return out.join('; ');
  }

  function fetchPage(key, page, transLang) {
    const res = UrlFetchApp.fetch(KRDICT_SEARCH_URL + '?' + query(pageParams(key, page, transLang)), { muteHttpExceptions: true });
    const body = res.getContentText();
    try {
      return parse(body);
    } catch (e) {
      return { error: { code: 'HTTP ' + res.getResponseCode(), message: 'not XML: ' + body.slice(0, 300) } };
    }
  }

  return { query: query, pageParams: pageParams, parse: parse, gloss: gloss, fetchPage: fetchPage };
})();

/**
 * Merges EN + RU pages into note rows: one note per headword (homographs joined with ' / '),
 * affixes and endings skipped. Pure (testable).
 * @return {Array<Object>} [{ko, gloss_en, gloss_ru, pos, pron_dict, krdict_code, krdict_grade}]
 */
function krdictMerge_(enItems, ruItems) {
  const ru = {};
  ruItems.forEach(function (it) { ru[it.target_code] = Krdict.gloss(it); });
  const byKo = {};
  const order = [];
  enItems.forEach(function (it) {
    if (!it.word || KRDICT_SKIP_POS.indexOf(it.pos) >= 0 || /^-|-$/.test(it.word)) return;
    const en = Krdict.gloss(it);
    const r = ru[it.target_code] || '';
    const cur = byKo[it.word];
    if (!cur) {
      byKo[it.word] = { ko: it.word, gloss_en: en, gloss_ru: r, pos: it.pos, pron_dict: it.pronunciation,
        krdict_code: String(it.target_code), krdict_grade: it.word_grade };
      order.push(it.word);
    } else {
      if (en) cur.gloss_en = cur.gloss_en ? cur.gloss_en + ' / ' + en : en;
      if (r) cur.gloss_ru = cur.gloss_ru ? cur.gloss_ru + ' / ' + r : r;
      cur.krdict_code += ',' + it.target_code;
    }
  });
  return order.map(function (k) { return byKo[k]; });
}

/**
 * Imports up to `limit` new 초급 headwords (default 500), most popular first.
 * Existing headwords (e.g. typed via the bot) are enriched, never duplicated. Safe to re-run.
 */
function importKrdict(limit) {
  limit = Number(limit) || 500;
  const key = requireProp_('KRDICT_KEY');
  const started = Date.now();
  const merged = [];
  const seen = {};
  let pages = 0;
  for (let page = 1; page <= 20 && merged.length < limit * 1.2; page++) {
    const en = Krdict.fetchPage(key, page, 1);
    if (en.error) return krdictLog_('ERROR', 'page ' + page + ' EN: ' + en.error.code + ' ' + en.error.message, started);
    if (!en.items.length) {
      if (page === 1) return krdictLog_('ERROR', 'page 1 returned 0 items (total=' + en.total + ')', started);
      break;
    }
    const ruRes = Krdict.fetchPage(key, page, 10);
    const ru = ruRes.error ? [] : ruRes.items;
    pages++;
    krdictMerge_(en.items, ru).forEach(function (n) {
      if (!seen[n.ko]) { seen[n.ko] = true; merged.push(n); }
    });
    if (en.items.length < 100) break;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const existing = {};
    Repo.readAll('notes').forEach(function (n) { existing[String(n.ko)] = n; });
    const now = Date.now();
    const notes = [];
    const cards = [];
    const enrich = [];
    merged.forEach(function (m) {
      const cur = existing[m.ko];
      if (cur) {
        if (!cur.krdict_code) enrich.push(Object.assign(cur, {
          gloss_en: cur.gloss_en || m.gloss_en, gloss_ru: cur.gloss_ru || m.gloss_ru, pos: cur.pos || m.pos,
          pron_dict: cur.pron_dict || m.pron_dict, krdict_code: m.krdict_code, krdict_grade: m.krdict_grade,
          topik_band: cur.topik_band || 'I', updated_at: now,
        }));
        return;
      }
      if (notes.length >= limit) return;
      const noteId = newId_('n');
      notes.push(Object.assign({
        note_id: noteId, meaning_uz: '', meaning_uz_status: 'none', topik_band: 'I', source: 'krdict',
        verified: true, created_at: now, updated_at: now, active: true,
      }, m));
      cards.push(newCardRow_(newId_('c'), noteId, 'recog', now));
    });
    Repo.writeRows('notes', enrich);
    Repo.append('notes', notes);
    Repo.append('cards', cards);
    return krdictLog_('INFO', 'pages=' + pages + ' fetched=' + merged.length + ' added=' + notes.length +
      ' enriched=' + enrich.length + ' first=' + merged.slice(0, 5).map(function (m) { return m.ko + ':' + m.gloss_en; }).join(', '), started);
  } finally {
    lock.releaseLock();
  }
}

function krdictLog_(level, msg, started) {
  const ms = Date.now() - started;
  console.log('krdict ' + level + ' ' + msg);
  Repo.append('logs', [{ ts: Date.now(), level: level, where: 'krdict.import', msg: msg.slice(0, 2000), ms: ms }]);
  return level + ': ' + msg;
}
