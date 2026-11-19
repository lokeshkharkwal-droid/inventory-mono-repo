import type { IAllProps } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor, TextPatterns } from 'tinymce';
import {
  DEFAULT_HIGHLIGHT_COLOR,
  isInTaskList,
  startTaskItem,
  toggleTaskList,
} from './commands';
import {
  CHECKED_CLASS,
  CHECKLIST_CLASS,
  formatSourceHtml,
  toEditorHtml,
  toStoredHtml,
} from './html';
import { createImageUploadHandler, IMAGE_FILE_TYPES } from './image-upload';

type InitOptions = NonNullable<IAllProps['init']>;

/**
 * Self-hosted TinyMCE (GPL, no Tiny Cloud API key): `scripts/copy-tinymce.mjs`
 * copies the `tinymce` package into `public/tinymce` on install, and Vite
 * serves `public/` at the app's base URL. TinyMCE then loads its theme,
 * model, plugins, icons and skins relative to this script.
 */
export const TINYMCE_SCRIPT_SRC = `${import.meta.env.BASE_URL}tinymce/tinymce.min.js`;

/** Approximate height of the menubar + toolbar (up to two wrapped rows) +
 * status bar, added to the caller's content-area `minHeight`/`maxHeight`
 * (TinyMCE sizes the whole editor, chrome included). */
const CHROME_HEIGHT = 150;

/** In `resizable` mode, the smallest content area the user can drag the
 * editor down to (about one line of text). */
const RESIZE_MIN_CONTENT_HEIGHT = 48;

const PLUGINS = [
  'lists',
  'table',
  'autolink',
  'link',
  'image',
  'code',
  'fullscreen',
  'autoresize',
  'wordcount',
];

const TOOLBAR =
  'fontfamily fontsize | bold italic underline forecolor backcolor | ' +
  'alignleft aligncenter alignright alignjustify | bullist numlist checklist outdent indent | ' +
  'table image link | fullscreen code | undo redo';

/** The notes editor has never offered headings, so the Format menu leaves out
 * TinyMCE's Blocks/Formats entries (the other menus keep their defaults). */
const FORMAT_MENU_ITEMS =
  'bold italic underline strikethrough superscript subscript codeformat | ' +
  'fontfamily fontsize align lineheight | forecolor backcolor | removeformat';

const FONT_FAMILY_FORMATS =
  'Arial=Arial;Georgia=Georgia;Times New Roman=Times New Roman;Courier New=Courier New;Verdana=Verdana';
const FONT_SIZE_FORMATS = '10px 12px 14px 16px 18px 20px 24px 28px';

const TEXT_COLORS = [
  '#111827',
  'Black',
  '#DC2626',
  'Red',
  '#D97706',
  'Amber',
  '#16A34A',
  'Green',
  '#2563EB',
  'Blue',
  '#7C3AED',
  'Purple',
];
const HIGHLIGHT_COLORS = [
  DEFAULT_HIGHLIGHT_COLOR,
  'Yellow',
  '#FED7AA',
  'Orange',
  '#BBF7D0',
  'Green',
  '#BFDBFE',
  'Blue',
  '#FBCFE8',
  'Pink',
  '#E5E7EB',
  'Grey',
];

/**
 * Markdown-style shortcuts, as the notes editor has always supported:
 * `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `==highlight==`, and at
 * the start of a line `- `/`* `/`+ ` (bullets), `1. ` (numbers), `[ ] `/`[x] `
 * (checklist), `> ` (quote), ```` ``` ```` (code block), `---` (rule).
 * Headings are deliberately absent — the notes editor has no headings.
 */
const TEXT_PATTERNS: TextPatterns.RawPattern[] = [
  { start: '**', end: '**', format: 'bold' },
  { start: '*', end: '*', format: 'italic' },
  { start: '~~', end: '~~', format: 'strikethrough' },
  { start: '`', end: '`', format: 'code' },
  {
    start: '==',
    end: '==',
    cmd: 'HiliteColor',
    value: DEFAULT_HIGHLIGHT_COLOR,
  },
  { start: '-', cmd: 'InsertUnorderedList', trigger: 'space' },
  { start: '*', cmd: 'InsertUnorderedList', trigger: 'space' },
  { start: '+', cmd: 'InsertUnorderedList', trigger: 'space' },
  { start: '1.', cmd: 'InsertOrderedList', trigger: 'space' },
  { start: '[ ]', cmd: 'mceNotesTaskItem', value: false, trigger: 'space' },
  { start: '[x]', cmd: 'mceNotesTaskItem', value: true, trigger: 'space' },
  { start: '>', cmd: 'mceBlockQuote', trigger: 'space' },
  { start: '```', format: 'pre', trigger: 'space' },
  { start: '---', cmd: 'InsertHorizontalRule', trigger: 'space' },
];

/** Keyboard shortcuts on top of TinyMCE's own (Mod+B/I/U, undo/redo, Tab in
 * lists and tables, Shift+Enter line break). */
function registerShortcuts(editor: TinyMCEEditor) {
  editor.addShortcut('meta+shift+s', '', 'Strikethrough');
  editor.addShortcut('meta+e', '', ['mceToggleFormat', false, 'code']);
  editor.addShortcut('meta+alt+c', '', ['FormatBlock', false, 'pre']);
  editor.addShortcut('meta+shift+b', '', 'mceBlockQuote');
  editor.addShortcut('meta+alt+0', '', ['FormatBlock', false, 'p']);
  // Mod+Enter = line break. Enter must be given as its key code — TinyMCE
  // reads a key name like "enter" as its first letter (i.e. Mod+E).
  editor.addShortcut('meta+13', '', 'InsertLineBreak');
  editor.addShortcut('meta+shift+8', '', 'InsertUnorderedList');
  editor.addShortcut('meta+shift+7', '', 'InsertOrderedList');
  editor.addShortcut('meta+shift+9', '', () => toggleTaskList(editor));
  editor.addShortcut('meta+shift+l', '', 'JustifyLeft');
  editor.addShortcut('meta+shift+e', '', 'JustifyCenter');
  editor.addShortcut('meta+shift+r', '', 'JustifyRight');
  editor.addShortcut('meta+shift+j', '', 'JustifyFull');
  editor.addShortcut('meta+shift+h', '', [
    'HiliteColor',
    false,
    DEFAULT_HIGHLIGHT_COLOR,
  ]);
  // TinyMCE's formatter registers heading/div/address block shortcuts
  // (Alt+Shift+1…9) during init — drop the ones the notes editor never had.
  editor.on('init', () => {
    [
      'access+1',
      'access+2',
      'access+3',
      'access+4',
      'access+5',
      'access+6',
      'access+8',
      'access+9',
    ].forEach((pattern) => editor.shortcuts.remove(pattern));
  });
}

/** Checklist (TinyMCE Community has none): a toolbar toggle button; click an
 * item's checkbox (drawn by the content skin in its left gutter) to toggle
 * it; a new item made with Enter starts unchecked. */
function registerChecklist(editor: TinyMCEEditor) {
  editor.addCommand('mceNotesTaskItem', (_ui, checked) =>
    startTaskItem(editor, checked === true),
  );

  editor.ui.registry.addToggleButton('checklist', {
    icon: 'checklist',
    tooltip: 'Checklist',
    onAction: () => toggleTaskList(editor),
    onSetup: (api) => {
      const update = () => api.setActive(isInTaskList(editor));
      editor.on('NodeChange', update);
      return () => editor.off('NodeChange', update);
    },
  });

  editor.on('mousedown', (e) => {
    const target = e.target as Element | null;
    const li = target?.closest?.('li');
    if (
      !li ||
      !editor.getBody().contains(li) ||
      !li.parentElement?.classList.contains(CHECKLIST_CLASS)
    )
      return;
    if (editor.mode.isReadOnly() || editor.options.get('disabled')) return;
    const rect = li.getBoundingClientRect();
    const view = li.ownerDocument.defaultView ?? window;
    const lineHeight = parseFloat(view.getComputedStyle(li).fontSize) * 1.5;
    if (e.clientX >= rect.left || e.clientY > rect.top + lineHeight) return;
    e.preventDefault();
    editor.undoManager.transact(() =>
      editor.dom.toggleClass(li, CHECKED_CLASS),
    );
    editor.nodeChanged();
  });

  editor.on('NewBlock', ({ newBlock }) => {
    if (
      newBlock.nodeName === 'LI' &&
      newBlock.parentElement?.classList.contains(CHECKLIST_CLASS)
    ) {
      editor.dom.removeClass(newBlock, CHECKED_CLASS);
    }
  });
}

/** Translate between the stored HTML and TinyMCE's editing model on every
 * way content enters or leaves the editor (see ./html.ts). Raw-format
 * content is the editor's own undo snapshots, already in the editing model.
 * The Source Code dialog reads content with `source_view`, which is shown
 * one block per line. */
function registerContentTransforms(editor: TinyMCEEditor) {
  editor.on('BeforeSetContent', (e) => {
    if (e.format !== 'raw' && typeof e.content === 'string')
      e.content = toEditorHtml(e.content);
  });
  editor.on('GetContent', (e) => {
    if (e.format !== 'html' || typeof e.content !== 'string') return;
    e.content = toStoredHtml(e.content);
    if (e.source_view) e.content = formatSourceHtml(e.content);
  });
}

/**
 * The Source Code window (title `'Source Code'`, opened as a normal —
 * non-inline — TinyMCE window per `registerInlineWindows` below) is NOT
 * DOM-wise inside the editor's own container, contrary to what an earlier
 * version of this file's comments assumed. TinyMCE appends every non-inline
 * window into a shared "aux sink" element (`.tox-tinymce-aux` /
 * `.tox-silver-sink`, one per editor instance) that it creates as a direct
 * child of `<body>` — confirmed by inspecting the live DOM: the Source
 * Code `<textarea>`'s ancestor chain is `.tox-dialog` → `.tox-dialog-wrap`
 * → `.tox-silver-sink.tox-tinymce-aux` → `<body>`, entirely outside
 * `editor.getContainer()`.
 *
 * Every notes editor sits inside a Radix modal dialog, whose `FocusScope`
 * traps focus by listening for `focusin`/`focusout` on `document` in the
 * BUBBLE phase and reverting focus that lands outside the dialog's own DOM
 * subtree. Since the sink is outside that subtree entirely, the trap doesn't
 * recognise a click/keystroke into the Source Code textarea as legitimate
 * and yanks focus straight back — which is exactly what made the dialog
 * look open but be unclickable/untypeable (confirmed live:
 * `document.activeElement` stayed on a wrapper `<div>`, never the textarea,
 * after clicking directly on it).
 *
 * Fix mirrors `PaginatedSelect`'s escape for its own portaled-to-`<body>`
 * menu: intercept `focusin`/`focusout` in the CAPTURE phase on `document`
 * (before Radix's bubble-phase handlers run) and stop them whenever the
 * focus move involves a `.tox-tinymce-aux` sink — covering every TinyMCE
 * dialog/menu on the page, not just this one editor's, since the check is
 * class-based rather than tied to a specific instance's sink reference
 * (TinyMCE doesn't expose the sink element on the public `Editor` API).
 * Registered once per editor instance for symmetry with editor lifecycle,
 * but cheap to double-register since it's a pure DOM class check with no
 * per-instance state.
 */
// Module-level singleton state for the escape below: a page can have several
// notes editors mounted at once (e.g. one Test Entry row's Useful For/
// Interpretation/Limitations/Remarks/References are 5 separate instances,
// and several rows can be expanded together), and each calls
// `registerFocusTrapEscape` on its own "PreInit". The fix itself is global —
// one `document`-level listener pair and one `MutationObserver` on
// `document.body` already cover every sink on the page regardless of which
// editor created it — so registering a fresh copy per instance would just be
// N redundant listeners/observers doing the identical check on every focus
// change and DOM mutation anywhere on the page. A refcount keeps exactly one
// copy alive for as long as at least one editor instance exists.
let escapeRefCount = 0;
let sinkObserver: MutationObserver | null = null;
let onFocusIn: ((e: FocusEvent) => void) | null = null;
let onFocusOut: ((e: FocusEvent) => void) | null = null;

/** Exported for `tinymce-config.focus-trap.test.ts` only — production
 * callers should go through `createEditorInit`, not call this directly. */
export function registerFocusTrapEscape(editor: TinyMCEEditor) {
  escapeRefCount += 1;
  if (escapeRefCount === 1) {
    const involvesTinyMCESink = (n: EventTarget | null) =>
      n instanceof Element && !!n.closest('.tox-tinymce-aux');
    onFocusIn = (e) => {
      if (involvesTinyMCESink(e.target)) e.stopImmediatePropagation();
    };
    onFocusOut = (e) => {
      if (involvesTinyMCESink(e.target) || involvesTinyMCESink(e.relatedTarget))
        e.stopImmediatePropagation();
    };
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);

    // Half two of the same bug: Radix Dialog sets `document.body.style.pointer
    // Events = 'none'` while open (to block clicks outside the dialog) and only
    // re-enables `pointer-events: auto` on the dialog's own content element via
    // CSS. The TinyMCE sink is a sibling of that dialog appended to <body>, so
    // it inherits the disabled pointer-events and never gets the override —
    // confirmed live: `getComputedStyle(sink).pointerEvents === 'none'` while
    // `document.body.style.pointerEvents === 'none'`, even though the escape
    // above already lets focus/typing through. Every click on a TinyMCE
    // dialog's own buttons (Save/Cancel/OK, in addition to Source Code's
    // textarea) was swallowed at the CSS layer regardless of focus handling.
    // Force `pointer-events: auto` back on any sink the moment TinyMCE creates
    // one — a MutationObserver on <body>'s children, not tied to a specific
    // window-open call, so it covers every sink regardless of which editor or
    // dialog created it and regardless of creation order relative to Radix's
    // own `pointer-events: none` being applied.
    const restoreSinkPointerEvents = () => {
      document
        .querySelectorAll<HTMLElement>('.tox-tinymce-aux')
        .forEach((sink) => {
          if (sink.style.pointerEvents !== 'auto')
            sink.style.pointerEvents = 'auto';
        });
    };
    restoreSinkPointerEvents();
    sinkObserver = new MutationObserver(restoreSinkPointerEvents);
    sinkObserver.observe(document.body, { childList: true });
  }

  editor.on('remove', () => {
    escapeRefCount -= 1;
    if (escapeRefCount > 0) return;
    if (onFocusIn) document.removeEventListener('focusin', onFocusIn, true);
    if (onFocusOut) document.removeEventListener('focusout', onFocusOut, true);
    sinkObserver?.disconnect();
    sinkObserver = null;
    onFocusIn = null;
    onFocusOut = null;
  });
}

/**
 * Every notes editor sits inside a Radix modal dialog, which traps focus and
 * blocks pointer events outside itself. TinyMCE's menus already render next
 * to the editor (`ui_mode: 'split'`), but its windows (link, image, source
 * code, table properties, colour picker) and alerts default to opening in a
 * shared sink appended to <body> (see `registerFocusTrapEscape` above for
 * why that broke both focus and clicks) — so they're set to open as
 * TinyMCE's inline dialogs instead, which render in the local popup layer
 * next to the toolbar, genuinely inside the editor's own DOM.
 *
 * The Source Code window (title `'Source Code'`, from TinyMCE's own `code`
 * plugin — see its `plugin.js` `open()`) is the one exception: it's a large
 * textarea, and the Radix dialog it lives in clips its own content area
 * (`overflow-hidden`, e.g. a `DialogContent`), so anchoring it inline next to the toolbar left
 * it visually squashed/clipped — the user had to drag it out to use it at
 * all. It's kept as a normal (non-inline) window instead, appended to the
 * <body>-level sink like every other non-inline TinyMCE window — sized and
 * positioned as TinyMCE's own floating dialog rather than shoehorned into
 * the toolbar-local popup layer, and made usable there by
 * `registerFocusTrapEscape` above (both the focus-trap and pointer-events
 * fixes) rather than by avoiding the sink the way the inline windows do.
 */
function registerInlineWindows(editor: TinyMCEEditor) {
  const wm = editor.windowManager;
  const open = wm.open;
  wm.open = (config, params) => {
    if (config.title === 'Source Code') return open(config, params);
    return open(config, { ...params, inline: params?.inline ?? 'toolbar' });
  };

  registerFocusTrapEscape(editor);

  const message = (
    text: string,
    buttons: 'ok' | 'yesNo',
    done: (confirmed: boolean) => void,
  ) => {
    let confirmed = false;
    open(
      {
        title: editor.translate('Message'),
        body: {
          type: 'panel',
          items: [
            {
              type: 'htmlpanel',
              html: `<p>${editor.dom.encode(editor.translate(text))}</p>`,
            },
          ],
        },
        buttons:
          buttons === 'ok'
            ? [{ type: 'submit', text: 'OK', primary: true }]
            : [
                { type: 'cancel', text: 'No' },
                { type: 'submit', text: 'Yes', primary: true },
              ],
        onSubmit: (api) => {
          confirmed = true;
          api.close();
        },
        onClose: () => done(confirmed),
      },
      { inline: 'toolbar' },
    );
  };
  wm.alert = (text, callback) => message(text, 'ok', () => callback?.());
  wm.confirm = (text, callback) =>
    message(text, 'yesNo', (confirmed) => callback?.(confirmed));
}

/**
 * TinyMCE `init` options for the notes editor: the classic TinyMCE editor —
 * menubar, toolbar, iframe content area and status bar, oxide skin — with the
 * notes editor's features, stored-HTML format and behaviours.
 */
export function createEditorInit({
  placeholder,
  minHeight,
  maxHeight,
  resizable = false,
  setup,
  onReady,
}: {
  placeholder?: string;
  /** Content-area height the editor starts at (it grows with its content
   * unless `resizable`). */
  minHeight: number;
  /** Content-area height it stops growing at (then scrolls); unlimited if
   * unset. Ignored when `resizable`. */
  maxHeight?: number;
  /** Fixed-height mode: the editor stays at `minHeight` instead of growing
   * with its content (it scrolls instead), and the user can drag the status
   * bar's bottom-right handle to make it taller or shorter. */
  resizable?: boolean;
  /** Wrapper-specific wiring (change/blur listeners). */
  setup: (editor: TinyMCEEditor) => void;
  /** Called once the editor is fully initialised. */
  onReady: (editor: TinyMCEEditor) => void;
}): InitOptions {
  const sizing: Partial<InitOptions> = resizable
    ? {
        // Fixed height, no autoresize plugin: the content area scrolls both
        // ways when its content doesn't fit (text still wraps). `resize: true`
        // adds TinyMCE's bottom-right drag handle (↑/↓ keys too), which sets
        // only this editor's height, down to about one line, no upper limit.
        height: minHeight + CHROME_HEIGHT,
        min_height: RESIZE_MIN_CONTENT_HEIGHT + CHROME_HEIGHT,
        resize: true,
      }
    : {
        // Grow with the content between the caller's min/max heights, as
        // before; autoresize owns the height, so the status bar has no resize
        // handle.
        min_height: minHeight + CHROME_HEIGHT,
        ...(maxHeight ? { max_height: maxHeight + CHROME_HEIGHT } : {}),
        autoresize_bottom_margin: 16,
        resize: false,
      };
  return {
    plugins: resizable
      ? PLUGINS.filter((p) => p !== 'autoresize')
      : [...PLUGINS],
    menubar: 'edit view insert format table',
    menu: { format: { title: 'Format', items: FORMAT_MENU_ITEMS } },
    toolbar: TOOLBAR,
    // Wrap onto a second row rather than hiding buttons behind "…" — every
    // control stays one click away, as it always has.
    toolbar_mode: 'wrap',
    branding: false,
    promotion: false,
    // The status bar's element-path segment (e.g. a bare "p") shows the HTML
    // tag the cursor is in — meaningless to a non-technical user and reads as
    // stray text. Word count stays (still useful), only the tag path is off.
    elementpath: false,
    // Menus, toolbars and (see registerInlineWindows) dialogs render next to
    // the editor, inside the Radix dialog it lives in.
    ui_mode: 'split',
    placeholder: placeholder ?? '',
    content_style:
      'body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; }',
    browser_spellcheck: true,
    ...sizing,
    font_family_formats: FONT_FAMILY_FORMATS,
    font_size_formats: FONT_SIZE_FORMATS,
    color_map_foreground: TEXT_COLORS,
    color_map_background: HIGHLIGHT_COLORS,
    // Store HTML the way the notes fields always have: absolute URLs as
    // uploaded (not rewritten relative to the page), literal characters
    // (µ, °, ±) instead of named entities — except a non-breaking space,
    // which stays a visible `&nbsp;` — and single-line markup.
    convert_urls: false,
    entity_encoding: 'named',
    entities: '160,nbsp',
    indent: false,
    // New tables start with a header row of <th> cells, as before.
    table_default_header_rows: 1,
    table_header_type: 'sectionCells',
    // Every link opens in a new tab, as before; bare domains get https://.
    link_default_target: '_blank',
    link_target_list: false,
    link_assume_external_targets: 'https',
    // Images come from the image dialog's Upload tab (or a URL) — never as
    // base64 pasted/dropped into the content.
    images_upload_handler: createImageUploadHandler(),
    images_file_types: IMAGE_FILE_TYPES,
    paste_data_images: false,
    text_patterns: TEXT_PATTERNS,
    setup: (editor: TinyMCEEditor) => {
      registerContentTransforms(editor);
      registerChecklist(editor);
      registerShortcuts(editor);
      // The window manager only exists once the editor has rendered.
      editor.on('PreInit', () => registerInlineWindows(editor));
      setup(editor);
    },
    // Runs after the React integration's own init step (which settles the
    // initial content), so the wrapper can load the caller's value last.
    init_instance_callback: (editor: TinyMCEEditor) => onReady(editor),
  };
}
