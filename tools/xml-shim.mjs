// Test-only stand-in for Apps Script XmlService (parse → Element with getName/getChild/
// getChildren/getChildText). Handles the subset krdict returns: elements, text, CDATA, entities.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m));

class El {
  constructor(name) { this.name = name; this.children = []; this.text = ''; }
  getName() { return this.name; }
  getChildren(n) { return n === undefined ? this.children : this.children.filter((c) => c.name === n); }
  getChild(n) { return this.children.find((c) => c.name === n) || null; }
  getChildText(n) { const c = this.getChild(n); return c ? c.text : null; }
  getText() { return this.text; }
}

export const XmlService = {
  parse(xml) {
    const root = new El('#doc');
    const stack = [root];
    const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<\/([\w:.-]+)\s*>|<([\w:.-]+)[^>]*?(\/?)>|([^<]+)/g;
    let m;
    while ((m = re.exec(xml))) {
      const top = stack[stack.length - 1];
      if (m[1] !== undefined) top.text += m[1];
      else if (m[2]) { if (stack.pop().name !== m[2]) throw new Error('mismatched </' + m[2] + '>'); }
      else if (m[3]) { const el = new El(m[3]); top.children.push(el); if (!m[4]) stack.push(el); }
      else if (m[5] !== undefined) top.text += decode(m[5]);
    }
    if (stack.length !== 1 || root.children.length !== 1) throw new Error('malformed XML');
    for (const el of walk(root.children[0])) el.text = el.children.length ? el.text.trim() : el.text;
    return { getRootElement: () => root.children[0] };
  },
};
function* walk(el) { yield el; for (const c of el.children) yield* walk(c); }
