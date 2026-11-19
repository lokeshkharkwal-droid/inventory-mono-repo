import type { Editor as TinyMCEEditor } from 'tinymce';
import { CHECKED_CLASS, CHECKLIST_CLASS, CHECKLIST_LIST_STYLE } from './html';

/**
 * Checklist (task list) commands for {@link NotesRichTextEditor}. TinyMCE
 * Community has no checklist, so this adds one on top of its list commands,
 * in the `ul.tox-checklist` editing model described in ./html.ts.
 */

/** Default highlight colour — the first highlight swatch; also used by the
 * `==text==` pattern and the highlight keyboard shortcut. */
export const DEFAULT_HIGHLIGHT_COLOR = '#FEF08A';

/** Nearest list (`ul`/`ol`) around the caret, inside this editor. */
function closestList(editor: TinyMCEEditor): HTMLElement | null {
  const node = editor.selection.getNode();
  const list = editor.dom.getParent(node, 'ul,ol', editor.getBody());
  return (list as HTMLElement | null) ?? null;
}

const isChecklist = (el: Element | null | undefined) =>
  !!el && el.nodeName === 'UL' && el.classList.contains(CHECKLIST_CLASS);

/** Whether the caret is inside a checklist (drives the toolbar button state). */
export const isInTaskList = (editor: TinyMCEEditor) =>
  isChecklist(closestList(editor));

/** Drop checked-state classes left on items of a list that stopped being a
 * checklist (so converting it back later starts unchecked). */
function clearOrphanCheckedItems(editor: TinyMCEEditor) {
  editor.dom.select(`li.${CHECKED_CLASS}`).forEach((li) => {
    if (!isChecklist(li.parentElement))
      editor.dom.removeClass(li, CHECKED_CLASS);
  });
}

function runListCommand(
  editor: TinyMCEEditor,
  command: string,
  value?: unknown,
) {
  editor.focus();
  editor.undoManager.transact(() => {
    editor.execCommand(command, false, value);
    clearOrphanCheckedItems(editor);
  });
  editor.nodeChanged();
}

/** Checklist on/off. Inside a checklist it turns the items back into
 * paragraphs; inside a bullet/numbered list it converts that list (items
 * unchecked); otherwise it starts a new checklist. */
export function toggleTaskList(editor: TinyMCEEditor) {
  const list = closestList(editor);
  if (isChecklist(list)) {
    runListCommand(editor, 'RemoveList');
    return;
  }
  if (!list) {
    runListCommand(editor, 'InsertUnorderedList', {
      'list-style-type': CHECKLIST_LIST_STYLE,
      'list-attributes': { class: CHECKLIST_CLASS },
    });
    return;
  }
  editor.focus();
  editor.undoManager.transact(() => {
    const bookmark = editor.selection.getBookmark();
    const ul =
      list.nodeName === 'OL'
        ? (editor.dom.rename(list, 'ul') as HTMLElement)
        : list;
    editor.dom.addClass(ul, CHECKLIST_CLASS);
    editor.dom.setStyle(ul, 'list-style-type', CHECKLIST_LIST_STYLE);
    Array.from(ul.children).forEach((li) =>
      editor.dom.removeClass(li as HTMLElement, CHECKED_CLASS),
    );
    editor.selection.moveToBookmark(bookmark);
  });
  editor.nodeChanged();
}

/** `[ ] ` / `[x] ` typed at the start of a line: start (or join) a checklist
 * and set the current item's checked state. */
export function startTaskItem(editor: TinyMCEEditor, checked: boolean) {
  if (!isInTaskList(editor)) toggleTaskList(editor);
  const li = editor.dom.getParent(
    editor.selection.getNode(),
    'li',
    editor.getBody(),
  );
  if (li) editor.dom.toggleClass(li, CHECKED_CLASS, checked);
}
