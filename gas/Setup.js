/**
 * One-time / idempotent setup, run from the Apps Script editor:
 *   1. setup()          → spreadsheet + Phase-1 tabs (trimmed), config defaults, WEBHOOK_KEY
 *   2. setWebhook()     → needs BOT_TOKEN and WEBAPP_URL (after the first deployment)
 *   3. setMenuButton()  → Mini App menu button (PAGES_URL)
 *   webhookInfo()       → prints getWebhookInfo (spike: no last_error_message)
 */
const SCHEMA = {
  config: { cols: ['key', 'value'], text: ['key'] },
  notes: {
    cols: ['note_id', 'ko', 'meaning_uz', 'meaning_uz_status', 'gloss_en', 'gloss_ru', 'pos', 'hanja', 'pron_dict',
      'krdict_code', 'krdict_grade', 'std_grade', 'topik_band', 'themes', 'tags', 'source', 'verified', 'example_ko',
      'example_uz', 'example_src', 'audio_url', 'ibrat_ref', 'created_at', 'updated_at', 'active'],
    text: ['note_id', 'ko', 'meaning_uz', 'meaning_uz_status', 'gloss_en', 'gloss_ru', 'pos', 'hanja', 'pron_dict',
      'krdict_code', 'krdict_grade', 'topik_band', 'themes', 'tags', 'source', 'example_ko', 'example_uz', 'example_src',
      'audio_url', 'ibrat_ref'],
  },
  cards: {
    cols: ['card_id', 'note_id', 'kind', 'due', 'stability', 'difficulty', 'state', 'reps', 'lapses', 'learning_steps',
      'scheduled_days', 'last_review', 'suspended', 'buried_until', 'is_leech'],
    text: ['card_id', 'note_id', 'kind'],
  },
  review_log: {
    cols: ['log_id', 'req_id', 'card_id', 'note_id', 'review_ts_utc_ms', 'rating', 'state_before', 'due_before', 's_before',
      'd_before', 's_after', 'd_after', 'scheduled_days', 'duration_ms', 'source', 'offset_h', 'params_version'],
    text: ['log_id', 'req_id', 'card_id', 'note_id', 'source'],
  },
  inbox: {
    cols: ['cap_id', 'ts', 'text', 'voice_file_id', 'situation', 'status', 'draft_json', 'note_id'],
    text: ['cap_id', 'text', 'voice_file_id', 'situation', 'status', 'draft_json', 'note_id'],
  },
  daily_stats: {
    cols: ['date', 'reviews', 'new', 'srs_min', 'min_by_block_json', 'mvd_done', 'build_min'],
    text: ['date', 'min_by_block_json'],
  },
  jobs: {
    cols: ['job_id', 'type', 'payload_json', 'status', 'attempts', 'next_run_at', 'error'],
    text: ['job_id', 'type', 'payload_json', 'status', 'error'],
  },
  logs: { cols: ['ts', 'level', 'where', 'msg', 'ms'], text: ['level', 'where', 'msg'] },
};

function setup() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(PROP.SPREADSHEET_ID);
  if (!id) {
    id = SpreadsheetApp.create('Hangang DB').getId();
    props.setProperty(PROP.SPREADSHEET_ID, id);
  }
  if (!props.getProperty(PROP.WEBHOOK_KEY)) {
    props.setProperty(PROP.WEBHOOK_KEY, (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''));
  }
  if (!props.getProperty(PROP.PAGES_URL)) props.setProperty(PROP.PAGES_URL, DEFAULT_PAGES_URL);

  const ss = SpreadsheetApp.openById(id);
  Object.keys(SCHEMA).forEach(function (name) { ensureSheet_(ss, name, SCHEMA[name]); });
  const extra = ss.getSheetByName('Sheet1') || ss.getSheetByName('Лист1') || ss.getSheetByName('시트1');
  if (extra && ss.getSheets().length > 1) ss.deleteSheet(extra);

  seedConfig_();
  CacheService.getScriptCache().remove('config');
  console.log('setup ok · spreadsheet ' + ss.getUrl());
  console.log('Missing properties: ' + [PROP.BOT_TOKEN, PROP.OWNER_ID, PROP.WEBAPP_URL].filter(function (k) { return !props.getProperty(k); }).join(', '));
}

/** Creates or extends a tab; header row frozen; text columns '@'; grid trimmed (empty cells count, §12.8). */
function ensureSheet_(ss, name, def) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    const blank = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 && /^(Sheet1|Лист1|시트1)$/.test(ss.getSheets()[0].getName());
    sh = blank ? ss.getSheets()[0].setName(name) : ss.insertSheet(name);
  }
  const lastCol = sh.getLastColumn();
  const have = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  const missing = def.cols.filter(function (c) { return have.indexOf(c) < 0; });
  if (missing.length) {
    if (sh.getMaxColumns() < have.length + missing.length) sh.insertColumnsAfter(sh.getMaxColumns(), have.length + missing.length - sh.getMaxColumns());
    sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  }
  sh.setFrozenRows(1);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  def.text.forEach(function (c) {
    sh.getRange(2, head.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  // Trim: keep header + data + 1 spare row; no spare columns.
  const keepRows = Math.max(sh.getLastRow() + 1, 2);
  if (sh.getMaxRows() > keepRows) sh.deleteRows(keepRows + 1, sh.getMaxRows() - keepRows);
  if (sh.getMaxColumns() > head.length) sh.deleteColumns(head.length + 1, sh.getMaxColumns() - head.length);
}

function seedConfig_() {
  const have = {};
  Repo.column('config', 'key').forEach(function (k) { have[k] = true; });
  const rows = Object.keys(CONFIG_DEFAULTS)
    .filter(function (k) { return !have[k]; })
    .map(function (k) { return { key: k, value: CONFIG_DEFAULTS[k] }; });
  Repo.append('config', rows);
}

/** §12.3: max_connections=1, only message + callback_query; drops the backlog. */
function setWebhook() {
  const url = requireProp_(PROP.WEBAPP_URL) + '?route=tg&key=' + requireProp_(PROP.WEBHOOK_KEY);
  const res = Telegram.call('setWebhook', {
    url: url,
    max_connections: 1,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  console.log(JSON.stringify(res));
  webhookInfo();
}

function webhookInfo() {
  const info = Telegram.call('getWebhookInfo', {});
  if (info.result && info.result.url) info.result.url = info.result.url.replace(/key=[^&]+/, 'key=***');
  console.log(JSON.stringify(info, null, 2));
}

/** §12.7: menu button opens the Mini App (initData is non-empty for this launch method). */
function setMenuButton() {
  const res = Telegram.call('setChatMenuButton', {
    menu_button: { type: 'web_app', text: 'Hangang', web_app: { url: prop_(PROP.PAGES_URL) || DEFAULT_PAGES_URL } },
  });
  console.log(JSON.stringify(res));
}
