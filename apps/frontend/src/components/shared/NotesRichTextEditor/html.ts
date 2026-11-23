/**
 * Pure HTML helpers for {@link NotesRichTextEditor}: empty-value handling, the
 * source-view pretty printer, and the two transforms that keep stored notes
 * HTML in the exact shape the app has always persisted (so existing records,
 * read-only renders and the backend keep working unchanged):
 *
 * - {@link toEditorHtml} — stored HTML → TinyMCE's editing model. Applied to
 *   everything that enters the editor (initial load, later `value` syncs, the
 *   source view, paste) via TinyMCE's `BeforeSetContent` event.
 * - {@link toStoredHtml} — the reverse, applied to everything read out of the
 *   editor via TinyMCE's `GetContent` event.
 *
 * Only task lists (checklists) and highlights need translating; everything
 * else (paragraphs, marks, lists, tables, inline styles, links, images) is
 * plain HTML that TinyMCE round-trips as-is.
 */

/** Empty-body sentinel for a cleared editor — normalize to "" so an untouched
 * field round-trips as empty rather than becoming "<p></p>". */
export const EMPTY_HTML = '<p></p>';

/** `""` for an empty editor body, the HTML unchanged otherwise. */
export const normalizeEmpty = (html: string): string =>
  html === EMPTY_HTML ? '' : html;

/** Class TinyMCE's list commands recognise as a custom (checklist) list, and
 * whose checkbox its oxide content skin draws — used for the editing model. */
export const CHECKLIST_CLASS = 'tox-checklist';
/** Marks a checked checklist item in the editing model. */
export const CHECKED_CLASS = 'tox-checklist--checked';
/** Inline list style every editing-model checklist carries. TinyMCE only
 * joins a new list into an adjacent one (or merges two neighbouring lists)
 * when their `list-style-type` matches, so this keeps a checklist and a
 * bullet list next to each other separate — as they always were. Stripped
 * again on the way out ({@link toStoredHtml}). */
export const CHECKLIST_LIST_STYLE = 'none';

/** `rel` for every link the editor creates (`target="_blank"`). */
export const LINK_REL = 'noopener noreferrer nofollow';

/** Block-level tags the source view puts on their own lines. TinyMCE drops
 * whitespace next to these when it parses HTML, so that formatting reads
 * back losslessly; inline tags are never split, so no stray spaces appear
 * between inline elements. */
const SOURCE_BLOCK_TAGS = new Set([
  'p',
  'div',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'blockquote',
  'pre',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'figure',
  'figcaption',
  'dl',
  'dt',
  'dd',
  'address',
  'section',
]);
const SOURCE_VOID_TAGS = new Set(['col', 'hr']);

/**
 * Format the editor's single-line HTML for TinyMCE's Source Code dialog: one
 * block per line, indented by nesting — displayed raw it reads as one
 * unbroken line. Inline markup and text stay exactly as they are.
 */
export function formatSourceHtml(html: string): string {
  const lines: string[] = [];
  let depth = 0;
  // The line being built, its indent, and the block tag it opened with (if
  // nothing block-level has happened since — then its closing tag joins it).
  let line: string | null = null;
  let lineDepth = 0;
  let lineOpenTag: string | null = null;
  const flush = () => {
    if (line !== null && line.trim())
      lines.push('  '.repeat(lineDepth) + line.trim());
    line = null;
    lineOpenTag = null;
  };
  for (const token of html.split(/(<[^>]+>)/)) {
    if (!token) continue;
    const tag = /^<(\/?)([a-zA-Z0-9]+)/.exec(token);
    const name = tag?.[2]?.toLowerCase();
    if (!tag || !name || !SOURCE_BLOCK_TAGS.has(name)) {
      if (line === null) {
        line = '';
        lineDepth = depth;
      }
      line += token;
    } else if (tag[1] !== '/') {
      flush();
      if (SOURCE_VOID_TAGS.has(name) || token.endsWith('/>')) {
        lines.push('  '.repeat(depth) + token);
      } else {
        line = token;
        lineDepth = depth;
        lineOpenTag = name;
        depth += 1;
      }
    } else {
      depth = Math.max(0, depth - 1);
      if (line !== null && lineOpenTag === name) {
        line += token;
        flush();
      } else {
        flush();
        lines.push('  '.repeat(depth) + token);
      }
    }
  }
  flush();
  return lines.join('\n');
}

/** Block-level tags that may sit directly inside a stored task item's
 * content `<div>`; any other (inline) content gets wrapped in a `<p>`. */
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'UL',
  'OL',
  'LI',
  'TABLE',
  'BLOCKQUOTE',
  'PRE',
  'HR',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'FIGURE',
  'DL',
  'ADDRESS',
  'SECTION',
]);

const parse = (html: string): Document =>
  new DOMParser().parseFromString(html, 'text/html');

const removeClass = (el: Element, cls: string) => {
  el.classList.remove(cls);
  if (el.classList.length === 0) el.removeAttribute('class');
};

/**
 * Stored → editing model.
 *
 * Task lists are stored as
 * `<ul data-type="taskList"><li data-checked="true" data-type="taskItem">`
 * `<label><input type="checkbox" checked="checked"><span></span></label>`
 * `<div><p>…</p></div></li></ul>`. TinyMCE can't edit that shape (Enter
 * would split the inner `<p>` instead of creating a new item), so it becomes
 * a plain `<ul class="tox-checklist"><li class="tox-checklist--checked">…`
 * list: the checkbox label is dropped and the content `<div>` unwrapped.
 *
 * Highlights stored as `<mark data-color="#…" style="background-color: …">`
 * become `<span style="background-color: …">` — the element TinyMCE's
 * highlight command applies and removes — so they stay changeable.
 */
export function toEditorHtml(html: string): string {
  if (!/data-type=["']?taskList|<mark[\s>]/i.test(html)) return html;
  const doc = parse(html);

  doc.querySelectorAll('ul[data-type="taskList"]').forEach((ul) => {
    ul.removeAttribute('data-type');
    ul.classList.add(CHECKLIST_CLASS);
    (ul as HTMLElement).style.listStyleType = CHECKLIST_LIST_STYLE;
    Array.from(ul.children).forEach((li) => {
      if (li.tagName !== 'LI') return;
      const children = Array.from(li.children);
      const checkbox = children
        .find((c) => c.tagName === 'LABEL')
        ?.querySelector('input[type="checkbox"]');
      const checked =
        li.getAttribute('data-checked') === 'true' ||
        !!checkbox?.hasAttribute('checked');
      li.removeAttribute('data-checked');
      li.removeAttribute('data-type');
      if (checked) li.classList.add(CHECKED_CLASS);
      children.forEach((child) => {
        if (child.tagName === 'LABEL') child.remove();
        else if (child.tagName === 'DIV')
          child.replaceWith(...Array.from(child.childNodes));
      });
    });
  });

  doc.querySelectorAll('mark').forEach((mark) => {
    const span = doc.createElement('span');
    Array.from(mark.attributes).forEach((attr) => {
      if (attr.name !== 'data-color') span.setAttribute(attr.name, attr.value);
    });
    const color =
      mark.getAttribute('data-color') || mark.style.backgroundColor || 'yellow';
    span.style.backgroundColor = color;
    // `color: inherit` only undid the browser's default <mark> text colour.
    if (span.style.color === 'inherit') span.style.removeProperty('color');
    span.append(...Array.from(mark.childNodes));
    mark.replaceWith(span);
  });

  return doc.body.innerHTML;
}

/**
 * Editing model → stored. The inverse of {@link toEditorHtml} for task lists
 * (rebuilds the exact stored markup, content wrapped in `<div>` and inline
 * runs in `<p>`), plus two clean-ups: checked-item classes left behind on a
 * checklist converted to a bullet/numbered list, and autolinked anchors
 * (`rel="noopener"`) upgraded to the full `rel` every other link carries.
 */
export function toStoredHtml(html: string): string {
  if (!html.includes(CHECKLIST_CLASS) && !html.includes('rel="noopener"'))
    return html;
  const doc = parse(html);

  doc.querySelectorAll(`ul.${CHECKLIST_CLASS}`).forEach((ul) => {
    removeClass(ul, CHECKLIST_CLASS);
    (ul as HTMLElement).style.removeProperty('list-style-type');
    if (!ul.getAttribute('style')) ul.removeAttribute('style');
    ul.setAttribute('data-type', 'taskList');
    Array.from(ul.children).forEach((li) => {
      if (li.tagName !== 'LI') return;
      const checked = li.classList.contains(CHECKED_CLASS);
      removeClass(li, CHECKED_CLASS);
      li.setAttribute('data-checked', String(checked));
      li.setAttribute('data-type', 'taskItem');

      const content = doc.createElement('div');
      let paragraph: HTMLParagraphElement | null = null;
      Array.from(li.childNodes).forEach((node) => {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          BLOCK_TAGS.has((node as Element).tagName)
        ) {
          paragraph = null;
          content.append(node);
        } else if (
          !paragraph &&
          node.nodeType === Node.TEXT_NODE &&
          !node.textContent?.trim()
        ) {
          // Formatting whitespace between blocks — not content.
          node.remove();
        } else {
          if (!paragraph) {
            paragraph = doc.createElement('p');
            content.append(paragraph);
          }
          paragraph.append(node);
        }
      });
      if (!content.firstChild) content.append(doc.createElement('p'));

      const label = doc.createElement('label');
      const input = doc.createElement('input');
      input.setAttribute('type', 'checkbox');
      if (checked) input.setAttribute('checked', 'checked');
      label.append(input, doc.createElement('span'));
      li.replaceChildren(label, content);
    });
  });

  doc
    .querySelectorAll(`.${CHECKED_CLASS}`)
    .forEach((el) => removeClass(el, CHECKED_CLASS));
  doc
    .querySelectorAll('a[target="_blank"][rel="noopener"]')
    .forEach((a) => a.setAttribute('rel', LINK_REL));

  return doc.body.innerHTML;
}
