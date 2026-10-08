/**
 * Notes + cards creation shared by the bot add syntax and the Mini App Add screen.
 */
const Notes = (function () {
  /**
   * Creates one note + one recognition card per new `ko` (D-09); skips existing headwords.
   * @param {Array<{ko:string, uz:string}>} items @param {string} source
   * @return {{added:number, dup:Array<string>, note_ids:Array<string>}}
   */
  function addBulk(items, source) {
    const now = Date.now();
    const existing = {};
    Repo.column('notes', 'ko').forEach(function (k) { existing[String(k)] = true; });
    const notes = [];
    const cards = [];
    const dup = [];
    items.forEach(function (it) {
      if (existing[it.ko]) { dup.push(it.ko); return; }
      existing[it.ko] = true;
      const noteId = newId_('n');
      notes.push({
        note_id: noteId, ko: it.ko, meaning_uz: it.uz, meaning_uz_status: 'own',
        source: source, verified: false, created_at: now, updated_at: now, active: true,
      });
      cards.push(newCardRow_(newId_('c'), noteId, 'recog', now));
    });
    Repo.append('notes', notes);
    Repo.append('cards', cards);
    return { added: notes.length, dup: dup, note_ids: notes.map(function (n) { return n.note_id; }) };
  }

  return { addBulk: addBulk };
})();
