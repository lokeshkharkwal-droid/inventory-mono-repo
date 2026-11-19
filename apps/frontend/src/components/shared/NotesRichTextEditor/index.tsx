import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { normalizeEmpty } from './html';
import { createEditorInit, TINYMCE_SCRIPT_SRC } from './tinymce-config';
import { CharacterCounter } from './CharacterCounter';
import { NOTE_MAX_LENGTH } from '@/lib/text-limits';

/** TinyMCE events after which the content may have changed. */
const CHANGE_EVENTS = 'input change undo redo SetContent compositionend';

/** The editor's current HTML, `""` when empty. */
const readHtml = (editor: TinyMCEEditor) => normalizeEmpty(editor.getContent());

/**
 * Rich-text (WYSIWYG) notes field — a standard TinyMCE editor (self-hosted; see
 * ./tinymce-config.ts). Ported from kaltros-fe's `NotesRichTextEditor` (same
 * init config, toolbar, checklist and HTML transforms) so notes look and behave
 * the same in both apps. Persists as plain HTML (see ./html.ts) into an existing
 * `string` field, e.g. the proforma `note`.
 */
export function NotesRichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  minHeight = 96,
  maxHeight,
  resizable = false,
  maxLength = NOTE_MAX_LENGTH,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Fired when the editor loses focus, with its current HTML — for
   * save-on-blur callers instead of persisting on every keystroke like
   * `onChange`. */
  onBlur?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Height the content area starts at; it grows with its content unless
   * `resizable`. */
  minHeight?: number;
  /** Caps the content area's growth so it scrolls internally once content
   * exceeds this height, instead of growing the box forever and pushing
   * whatever sits below it (e.g. a caller's Save/Submit buttons) further
   * down the page. Unlimited when unset. Ignored when `resizable`. */
  maxHeight?: number;
  /** Fixed-height mode: the editor
   * starts at `minHeight` and never grows with its content — it scrolls
   * vertically and horizontally instead — and only the user changes its
   * height, by dragging the handle at its bottom-right corner. Each editor
   * keeps its own height. Off by default (the editor auto-grows). */
  resizable?: boolean;
  /** Length limit shown by the counter (default: the shared `NOTE_MAX_LENGTH`, the same rule the backend enforces).
   * Pass `null` to show no counter. The editor never blocks typing; saving is what is refused when over. */
  maxLength?: number | null;
}) {
  /** The TinyMCE instance, once fully initialised (`null` while loading). */
  const [editor, setEditor] = useState<TinyMCEEditor | null>(null);

  // Latest callbacks, for the TinyMCE listeners bound once at setup.
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;

  /* The HTML last loaded into the editor from OUTSIDE (the initial `value`,
     or a later async `value` prop sync) — as opposed to the live `value` prop
     a caller may have already updated via `onChange` before blur fires. A
     caller that autosaves on blur needs to know
     "did the user actually change anything since it was loaded", and the
     `value` prop alone can't answer that: by the time blur fires, `onChange`
     has typically already pushed the caller's own state to match the
     editor's live content, so comparing blur's HTML against a fresh `value`
     read always looks unchanged. Comparing against this ref (which only
     moves on an external sync, never on `onChange`) answers the right
     question. Holds the editor's own serialization of what was loaded, so an
     untouched field compares equal. */
  const syncedValueRef = useRef('');
  /** The HTML last reported through `onChange` — a `value` prop equal to it
   * is just the caller echoing the editor's own edit back. */
  const emittedRef = useRef('');
  /** True while the wrapper itself sets the content (external sync), so that
   * isn't reported as a user edit. */
  const loadingRef = useRef(false);

  const [init] = useState(() =>
    createEditorInit({
      placeholder,
      minHeight,
      maxHeight,
      resizable,
      onReady: setEditor,
      setup: (ed) => {
        ed.on(CHANGE_EVENTS, () => {
          if (loadingRef.current || !ed.initialized) return;
          const html = readHtml(ed);
          if (html === emittedRef.current) return;
          emittedRef.current = html;
          onChangeRef.current(html);
        });
        ed.on('blur', () => {
          const handleBlur = onBlurRef.current;
          if (!handleBlur) return;
          const html = readHtml(ed);
          // Only fire when the content actually differs from what this editor
          // was last externally loaded with — not per every focus-out. Guards
          // against a stray blur on a field the user never touched (e.g. one
          // that arrived empty and got synced in later) saving a no-op, while
          // still firing correctly for a real edit (see `syncedValueRef`).
          if (html === syncedValueRef.current) return;
          handleBlur(html);
        });
      },
    }),
  );

  /* Push the caller's `value` into the editor — once it's ready, and again
     whenever `value` changes. Callers that load `value` asynchronously (a
     detail fetch that lands after this editor has already mounted on an empty
     string) or replace it (a form Reset) would otherwise show a stale editor. Skipped when the new
     `value` is already what's on screen — otherwise this would stomp the
     user's own in-progress keystrokes on every render.

     `resetContent` also resets the undo history — without that, this
     programmatic sync would become an undo step of its own, so hitting Undo
     right after opening a field the user never touched would blank it back
     to the pre-sync (empty) state instead of doing nothing. */
  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    // A `value` prop update that already matches the editor's own live
    // content is just the caller echoing back what `onChange` just told it
    // (e.g. a react-hook-form `Controller` round-tripping `field.value`) — not
    // a real external load, so `syncedValueRef` must NOT
    // move here or every keystroke would reset the "loaded" baseline to
    // whatever was just typed, making the onBlur guard above a no-op.
    if (incoming === emittedRef.current || incoming === readHtml(editor))
      return;
    loadingRef.current = true;
    try {
      editor.resetContent(incoming);
    } finally {
      loadingRef.current = false;
    }
    const loaded = readHtml(editor);
    syncedValueRef.current = loaded;
    emittedRef.current = loaded;
  }, [editor, value]);

  return (
    <>
      <Editor
        tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
        licenseKey="gpl"
        disabled={disabled}
        init={init}
      />
      {maxLength ? (
        <CharacterCounter length={(value ?? '').length} max={maxLength} />
      ) : null}
    </>
  );
}
