import type { ReactNode } from 'react';
import '@/styles/ezht-form.css';

/**
 * Wraps an existing (Tailwind) document form in the legacy EZ Health Track card
 * chrome + `.ezht-skin`, which restyles its controls/table/submit to the legacy
 * Bootstrap-3 look — without rewriting the form's JSX or its totals engine.
 */
export function EzhtSkin({
  title,
  maxWidth = 1100,
  children,
}: {
  title: string;
  maxWidth?: number;
  children: ReactNode;
}) {
  return (
    <div className="ezht-form ezht-skin" style={{ maxWidth }}>
      <div className="ezht-modal">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">{title}</h4>
        </div>
        <div className="ezht-modal-body">{children}</div>
      </div>
    </div>
  );
}
