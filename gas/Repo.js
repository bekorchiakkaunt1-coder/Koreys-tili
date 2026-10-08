/**
 * Sheets repository (§12.8): header-based column mapping, one getValues/setValues per batch.
 * Callers hold LockService around writes (Router holds the script lock for the webhook).
 */
const Repo = (function () {
  let ss_ = null;

  function ss() {
    if (!ss_) ss_ = SpreadsheetApp.openById(requireProp_(PROP.SPREADSHEET_ID));
    return ss_;
  }

  /** @return {GoogleAppsScript.Spreadsheet.Sheet} */
  function sheet(name) {
    const sh = ss().getSheetByName(name);
    if (!sh) throw new Error('Missing sheet: ' + name + ' (run setup)');
    return sh;
  }

  function headers(sh) {
    return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  }

  /** @return {Array<Object>} each row object carries a hidden `_row` (1-based sheet row) */
  function readAll(name) {
    const sh = sheet(name);
    const last = sh.getLastRow();
    const head = headers(sh);
    if (last < 2) return [];
    return sh.getRange(2, 1, last - 1, head.length).getValues().map(function (vals, i) {
      const o = { _row: i + 2 };
      head.forEach(function (h, j) { o[h] = vals[j]; });
      return o;
    });
  }

  /** Reads one column as an array (row order). */
  function column(name, col) {
    const sh = sheet(name);
    const last = sh.getLastRow();
    if (last < 2) return [];
    const j = headers(sh).indexOf(col);
    if (j < 0) throw new Error(name + ': no column ' + col);
    return sh.getRange(2, j + 1, last - 1, 1).getValues().map(function (r) { return r[0]; });
  }

  /** Appends objects in one setValues call; unknown keys are ignored, missing → ''. */
  function append(name, objs) {
    if (!objs.length) return;
    const sh = sheet(name);
    const head = headers(sh);
    const rows = objs.map(function (o) {
      return head.map(function (h) { return o[h] === undefined || o[h] === null ? '' : o[h]; });
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
  }

  /** Updates the given fields of one row (1-based sheet row). */
  function update(name, row, fields) {
    const sh = sheet(name);
    const head = headers(sh);
    Object.keys(fields).forEach(function (k) {
      const j = head.indexOf(k);
      if (j < 0) throw new Error(name + ': no column ' + k);
      sh.getRange(row, j + 1).setValue(fields[k]);
    });
  }

  /** First row whose `col` equals `value`, or null. */
  function findBy(name, col, value) {
    const vals = column(name, col);
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i]) === String(value)) {
        const sh = sheet(name);
        const head = headers(sh);
        const rowVals = sh.getRange(i + 2, 1, 1, head.length).getValues()[0];
        const o = { _row: i + 2 };
        head.forEach(function (h, j) { o[h] = rowVals[j]; });
        return o;
      }
    }
    return null;
  }

  return { ss: ss, sheet: sheet, readAll: readAll, column: column, append: append, update: update, findBy: findBy };
})();

/** Short sortable id: prefix + base36 ms + 4 random chars. */
function newId_(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
