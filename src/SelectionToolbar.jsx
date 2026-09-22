import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { AlignLeft, ArrowDownWideNarrow, ChevronDown, List, WandSparkles } from 'lucide-react';

const options = [
  ['summarize', 'Summarize', AlignLeft],
  ['shorten', 'Shorten', ArrowDownWideNarrow],
  ['simplify', 'use simpler language', WandSparkles],
  ['bullets', 'convert to bullet points', List],
];

export default function SelectionToolbar({ onAction }) {
  const [editor] = useLexicalComposerContext();
  const [position, setPosition] = useState(null);
  const [open, setOpen] = useState(false);
  const panel = useRef(null), trigger = useRef(null), saved = useRef(null);
  const close = useCallback(() => { setOpen(false); setPosition(null); saved.current = null; }, []);

  useEffect(() => {
    let frame;
    const update = () => {
      if (panel.current?.contains(document.activeElement)) return;
      const root = editor.getRootElement(), native = window.getSelection();
      if (!root || !native?.rangeCount || native.isCollapsed || !root.contains(native.anchorNode) || !root.contains(native.focusNode)) { close(); return; }
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed() || !selection.getTextContent().trim()) { close(); return; }
        const rects = native.getRangeAt(0).getClientRects();
        const rect = rects[0];
        if (!rect) { close(); return; }
        const bounds = root.getBoundingClientRect();
        if (rect.bottom < Math.max(0, bounds.top) || rect.top > Math.min(window.innerHeight, bounds.bottom)) { close(); return; }
        const text = selection.getTextContent();
        if (saved.current?.text !== text) setOpen(false);
        saved.current = { selection: selection.clone(), text };
        setPosition({ left: Math.max(10, Math.min(rect.left, window.innerWidth - 250)), top: rect.top >= 56 ? rect.top - 46 : rect.bottom + 8 });
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const outside = event => { if (!panel.current?.contains(event.target)) { setOpen(false); if (!editor.getRootElement()?.contains(event.target)) close(); } };
    const key = event => {
      if (event.key === 'Escape') { setOpen(false); if (panel.current?.contains(document.activeElement)) trigger.current?.focus(); }
      if (event.altKey && event.key === 'Enter' && saved.current) { event.preventDefault(); trigger.current?.focus(); }
    };
    const unregister = editor.registerUpdateListener(schedule);
    document.addEventListener('selectionchange', schedule);
    document.addEventListener('pointerup', schedule);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame); unregister();
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('pointerup', schedule);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [editor, close]);

  const focusItem = index => requestAnimationFrame(() => panel.current?.querySelectorAll('[role="menuitem"]')[index]?.focus());
  if (!position) return null;
  return createPortal(<div ref={panel} className="selection-toolbar" style={position} role="toolbar" aria-label="Selection editing" onPointerDown={event => event.preventDefault()}>
    <button ref={trigger} type="button" className="selection-trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'selection-edit-menu' : undefined} title="Edit selection (Alt+Enter)" onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); focusItem(event.key === 'ArrowDown' ? 0 : options.length - 1); }
    }}><WandSparkles size={15}/><span>edit selection</span><ChevronDown size={14}/></button>
    {open && <div id="selection-edit-menu" className={`selection-menu ${position.top + 240 > window.innerHeight ? 'above' : ''}`} role="menu" aria-label="Edit selection options" onKeyDown={event => {
      const items = [...panel.current.querySelectorAll('[role="menuitem"]')], current = items.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[index]?.focus();
      }
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      if (event.key === 'Tab') setOpen(false);
    }}>{options.map(([key, label, Icon]) => <button type="button" role="menuitem" tabIndex={-1} key={key} onClick={() => {
      if (saved.current) onAction?.(key, saved.current, editor);
      close();
    }}><Icon size={16}/>{label}</button>)}</div>}
  </div>, document.body);
}
