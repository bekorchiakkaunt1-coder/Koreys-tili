/**
 * Sheets repository (§12.8): header-based column mapping, one getValues/setValues per batch.
 * Per-execution caches (sheet handles, headers, whole tables) keep a request to ~1 Sheets
 * call per tab. Callers hold LockService around writes (Router holds it for the webhook).
 */
const Repo = (function () {
  let ss_ = null;
  const sheets_ = {};
  const heads_ = {};
  const tables_ = {};

  function ss() {
    if (!ss_) ss_ = SpreadsheetApp.openById(requireProp_(PROP.SPREADSHEET_ID));
    return ss_;
  }

  /** @return {GoogleAppsScript.Spreadsheet.Sheet} */
  function sheet(name) {
    if (sheets_[name]) return sheets_[name];
    const sh = ss().getSheetByName(name);
    if (!sh) throw new Error('Missing sheet: ' + name + ' (run setup)');
    return (sheets_[name] = sh);
  }

  function headers(name) {
    if (!heads_[name]) {
      const sh = sheet(name);
      heads_[name] = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    }
    return heads_[name];
  }

  function toObjects(head, rows, firstRow) {
    return rows.map(function (vals, i) {
      const o = { _row: i + firstRow };
      head.forEach(function (h, j) { o[h] = vals[j]; });
      return o;
    });
  }

  /**
   * Whole tab in one getDataRange() call, cached for this execution.
   * @return {Array<Object>} each row object carries a hidden `_row` (1-based sheet row)
   */
  function readAll(name) {
    if (tables_[name]) return tables_[name];
    const values = sheet(name).getDataRange().getValues();
    const head = values.length ? values[0].map(String) : [];
    heads_[name] = head;
    const rows = toObjects(head, values.slice(1), 2).filter(function (o) {
      return head.some(function (h) { return o[h] !== ''; });
    });
    return (tables_[name] = rows);
  }

  /** Reads one column as an array (row order); one call when headers are cached. */
  function column(name, col) {
    if (tables_[name]) return tables_[name].map(function (o) { return o[col]; });
    const sh = sheet(name);
    const last = sh.getLastRow();
    if (last < 2) return [];
    const j = headers(name).indexOf(col);
    if (j < 0) throw new Error(name + ': no column ' + col);
    return sh.getRange(2, j + 1, last - 1, 1).getValues().map(function (r) { return r[0]; });
  }

  function rowValues(head, o) {
    return head.map(function (h) { return o[h] === undefined || o[h] === null ? '' : o[h]; });
  }

  /** Appends objects in one setValues call; unknown keys are ignored, missing → ''. */
  function append(name, objs) {
    if (!objs.length) return;
    const sh = sheet(name);
    const head = headers(name);
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, objs.length, head.length).setValues(objs.map(function (o) { return rowValues(head, o); }));
    if (tables_[name]) {
      objs.forEach(function (o, i) { tables_[name].push(Object.assign({ _row: start + i }, o)); });
    }
  }

  /** Updates the given fields of one row (1-based sheet row). */
  function update(name, row, fields) {
    const sh = sheet(name);
    const head = headers(name);
    Object.keys(fields).forEach(function (k) {
      const j = head.indexOf(k);
      if (j < 0) throw new Error(name + ': no column ' + k);
      sh.getRange(row, j + 1).setValue(fields[k]);
    });
    delete tables_[name];
  }

  /**
   * Rewrites rows (objects carrying `_row`). With the tab cached, writes the block between the
   * first and last changed row in a single setValues; otherwise one call per row.
   */
  function writeRows(name, objs) {
    if (!objs.length) return;
    const sh = sheet(name);
    const head = headers(name);
    const table = tables_[name];
    if (table) {
      const byRow = {};
      table.forEach(function (o) { byRow[o._row] = o; });
      objs.forEach(function (o) { byRow[o._row] = o; });
      const rows = objs.map(function (o) { return o._row; });
      const lo = Math.min.apply(null, rows);
      const hi = Math.max.apply(null, rows);
      const block = [];
      for (let r = lo; r <= hi; r++) block.push(rowValues(head, byRow[r] || {}));
      sh.getRange(lo, 1, block.length, head.length).setValues(block);
      tables_[name] = table.map(function (o) { return byRow[o._row]; });
      return;
    }
    objs.forEach(function (o) {
      sh.getRange(o._row, 1, 1, head.length).setValues([rowValues(head, o)]);
    });
  }

  /** First row whose `col` equals `value`, or null. */
  function findBy(name, col, value) {
    const rows = readAll(name);
    for (let i = 0; i < rows.length; i++) if (String(rows[i][col]) === String(value)) return rows[i];
    return null;
  }

  /** Drops per-execution caches (each Apps Script execution starts fresh; tests reuse one context). */
  function reset() {
    ss_ = null;
    [sheets_, heads_, tables_].forEach(function (c) { Object.keys(c).forEach(function (k) { delete c[k]; }); });
  }

  return { reset: reset, ss: ss, sheet: sheet, readAll: readAll, column: column, append: append, update: update, writeRows: writeRows, findBy: findBy };
})();

/** Short sortable id: prefix + base36 ms + 4 random chars. */
function newId_(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
