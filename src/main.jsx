import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isRangeSelection, $createParagraphNode, $createTextNode, FORMAT_TEXT_COMMAND } from 'lexical';
import { HeadingNode, $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode } from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import { Bold, Italic, List, ListOrdered, Heading, Check, Lightbulb, ArrowUpRight, ShieldCheck, RotateCcw, FileText, ChevronDown } from 'lucide-react';
import SelectionToolbar from './SelectionToolbar.jsx';
import './styles.css';

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [format, setFormat] = useState({});
  useEffect(() => editor.registerUpdateListener(({ editorState }) => editorState.read(() => {
    const s = $getSelection();
    if (!$isRangeSelection(s)) return;
    let node = s.anchor.getNode(), list = null, heading = false;
    while (node) { if ($isListNode(node)) list = node.getListType(); if ($isHeadingNode(node)) heading = true; node = node.getParent(); }
    setFormat({ bold: s.hasFormat('bold'), italic: s.hasFormat('italic'), heading, bullet: list === 'bullet', number: list === 'number' });
  })), [editor]);
  const buttons = [
    ['bold', 'Bold', Bold, () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')],
    ['italic', 'Italic', Italic, () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')],
    ['bullet', 'Bulleted list', List, () => editor.dispatchCommand(format.bullet ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND, undefined)],
    ['number', 'Numbered list', ListOrdered, () => editor.dispatchCommand(format.number ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)],
    ['heading', 'Heading', Heading, () => editor.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) $setBlocksType(s, () => format.heading ? $createParagraphNode() : $createHeadingNode('h2')); })],
  ];
  return <div className="toolbar" role="toolbar" aria-label="Text formatting">{buttons.map(([key, label, Icon, action]) => <button key={key} type="button" title={label} aria-label={label} aria-pressed={!!format[key]} onMouseDown={e => e.preventDefault()} onClick={action}><Icon size={19}/></button>)}</div>;
}
function EditorActions({ action }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => { if (!action) return; editor.update(() => { const root = $getRoot(); root.clear(); (action.text || '').split(/\n+/).forEach(line => root.append($createParagraphNode().append($createTextNode(line)))); root.selectEnd(); }); }, [action, editor]);
  return null;
}
function readDraft() { try { return sessionStorage.getItem('listing-lab-draft') || ''; } catch { return ''; } }
function savedEditorState() {
  try { const value = sessionStorage.getItem('listing-lab-state'); if (value && JSON.parse(value).root) return value; } catch {}
  return () => { const draft = readDraft(); draft.split(/\n+/).forEach(line => $getRoot().append($createParagraphNode().append($createTextNode(line)))); };
}
function App() {
  const [category, setCategory] = useState(() => { try { return sessionStorage.getItem('listing-lab-category') || 'seating'; } catch { return 'seating'; } });
  const [categories, setCategories] = useState([]), [descriptors, setDescriptors] = useState([]);
  const categoryRef = useRef(category);
  const selectedCategory = categories.find(c => c.id === category);
  useEffect(() => { fetch('/taxonomy/catalog.json').then(r => { if (!r.ok) throw new Error('Taxonomy missing. Run pnpm model:train.'); return r.json(); }).then(data => { setCategories(data.categories); if (!data.categories.some(c => c.id === categoryRef.current)) setCategory('seating'); }).catch(e => { setError(e.message); setStatus('error'); }); }, []);
  const [text, setText] = useState(readDraft), [action, setAction] = useState(null);
  const [status, setStatus] = useState('loading'), [results, setResults] = useState([]), [ms, setMs] = useState(null), [error, setError] = useState('');
  const worker = useRef(null), revision = useRef(0), timer = useRef(null), currentText = useRef(text);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { try { sessionStorage.setItem('listing-lab-draft', text); } catch {} }, [text]);
  useEffect(() => {
    let active = true;
    setStatus('loading'); setResults([]); setMs(null); setError('');
    revision.current++; clearTimeout(timer.current);
    const w = new Worker(new URL('./classifier.worker.js', import.meta.url), { type: 'module' }); worker.current = w;
    w.onmessage = ({ data }) => {
      if (!active) return;
      if (data.type === 'ready') { setStatus('ready'); w.postMessage({ id: revision.current, text: currentText.current, category: categoryRef.current }); }
      if (data.type === 'error') { setStatus('error'); setError(data.message); }
      if (data.type === 'profile' && data.category === categoryRef.current) setDescriptors(data.descriptors);
      if (data.type === 'result' && data.id === revision.current && data.category === categoryRef.current) { setResults(data.results); setMs(data.ms); setStatus('ready'); }
    };
    w.onerror = () => { if (active) { setStatus('error'); setError('The local classifier could not start. Check the model setup and reload.'); } };
    w.postMessage({ type: 'init' });
    return () => { active = false; w.terminate(); clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    categoryRef.current = category;
    try { sessionStorage.setItem('listing-lab-category', category); } catch {}
    revision.current++; clearTimeout(timer.current); setResults([]); setDescriptors([]); setExpanded(null); setMs(null);
    setStatus(previous => previous === 'ready' ? 'analyzing' : previous);
    worker.current?.postMessage({ id: revision.current, text: currentText.current, category });
  }, [category]);
  const changed = state => state.read(() => {
    try { sessionStorage.setItem('listing-lab-state', JSON.stringify(state.toJSON())); } catch {}
    const next = $getRoot().getTextContent();
    if (next === currentText.current) return;
    currentText.current = next; setText(next); revision.current++; setResults([]);
    clearTimeout(timer.current);
    if (status !== 'loading' && status !== 'error') setStatus('analyzing');
    timer.current = setTimeout(() => worker.current?.postMessage({ id: revision.current, text: next, category: categoryRef.current }), 300);
  });
  const detected = results.filter(r => r.detected).length;
  const detectionSnapshot = useRef(null);
  detectionSnapshot.current = { encoder: 'minilm', category, text, status, results, ms };
  useEffect(() => {
    const context = document.modelContext; if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { Promise.resolve(context.registerTool({ name: 'read_detected_details', description: 'Read the current description and detected product details.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: input => { if (!input || typeof input !== 'object' || Object.keys(input).length) throw new Error('Expected an empty object.'); return detectionSnapshot.current; } }, { signal: lifecycle.signal })).catch(() => {}); } catch {}
    return () => lifecycle.abort();
  }, []);
  return <div className="app">
    <header><a className="brand" href="/" aria-label="Listing Lab home"><span className="brand-mark"><FileText size={20}/></span>Listing Lab<span className="tag">LOCAL DEMO</span></a><span className="private"><ShieldCheck size={16}/>Your words stay on this device</span></header>
    <main>
      <div className="intro"><div className="eyebrow">PRODUCT DESCRIPTION</div><h1>A little detail goes a long way.</h1><p>Describe your item. See the details buyers care about take shape as you write.</p></div>
      <div className="workspace"><section className="writing" aria-label="Description editor">
        <div className="section-top"><label id="description-label">Description <span className="required">*</span></label><button className="text-button" onClick={() => setAction({ text: selectedCategory?.sample || '' })}>Try an example <ArrowUpRight size={15}/></button></div>
        <p className="helper">What makes your item special? Tell its story, from the materials to the small details.</p>
        <LexicalComposer initialConfig={{ namespace: 'ListingLab', editorState: savedEditorState(), nodes: [HeadingNode, ListNode, ListItemNode], theme: { paragraph: 'editor-paragraph', text: { bold: 'editor-bold', italic: 'editor-italic' }, heading: { h2: 'editor-heading' }, list: { ul: 'editor-list', ol: 'editor-list' } }, onError: error => { console.error(error); setError('The editor encountered an error. Please reload.'); } }}>
          <div className="editor-shell"><div className="editor-area"><RichTextPlugin contentEditable={<ContentEditable className="editor" aria-labelledby="description-label" spellCheck/>} placeholder={<div className="placeholder">Start with what it is. Then add what makes it yours…</div>} ErrorBoundary={LexicalErrorBoundary}/></div><div className="editor-bottom"><Toolbar/><span className="word-count">{text.trim() ? text.trim().split(/\s+/).length : 0} words</span></div></div>
          <HistoryPlugin/><ListPlugin/><OnChangePlugin onChange={changed} ignoreSelectionChange ignoreHistoryMergeTagChange={false}/><EditorActions action={action}/><SelectionToolbar/>
        </LexicalComposer>
        <div className="below-editor"><span><ShieldCheck size={15}/>Analyzed locally, as you type</span><button className="text-button muted" onClick={() => setAction({ text: '' })} disabled={!text.trim()}><RotateCcw size={14}/>Clear description</button></div>
        <div className="note"><span className="note-line"/><p>Specifics help buyers picture your item.<br/><strong>Include the details that are relevant to what you’re selling.</strong></p></div>
      </section>
      <aside className="details"><div className="details-heading"><span className="bulb"><Lightbulb size={22}/></span><div><h2>What buyers want to know</h2><p>A helpful check as you write.</p></div></div>
        <div className="model-picker"><label htmlFor="product-category">Product type</label><select id="product-category" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><span>Checks the details relevant to this product</span></div>
        <div className="progress-label"><span>Details included</span><strong>{detected}<span> / {descriptors.length}</span></strong></div><div className="progress" role="progressbar" aria-label="Details detected" aria-valuenow={detected} aria-valuemin={0} aria-valuemax={descriptors.length}><div style={{ width: `${detected / (descriptors.length || 1) * 100}%` }}/></div>
        <div className="descriptor-grid" style={{ gridTemplateRows: `repeat(${Math.max(1, Math.ceil(descriptors.length / 2))}, auto)` }}>{descriptors.map((d, i) => { const result = results.find(r => r.id === d.id); const active = result?.detected; return <div className={`descriptor ${active ? 'detected' : ''} ${expanded === i ? 'expanded' : ''}`} key={d.id}><button onClick={() => setExpanded(expanded === i ? null : i)} aria-expanded={expanded === i} aria-label={`${d.name}: ${active ? 'detected' : 'not detected'}`}><span className="check">{active && <Check size={12} strokeWidth={3}/>}</span><span>{d.name}</span><ChevronDown className="chevron" size={12}/></button>{expanded === i && <div className="evidence"><strong>{d.question}</strong>{active ? <><span>SUPPORTING PASSAGE</span>“{result.evidence}”</> : <>Not found in your description.<em>Example: {d.examples[0]}</em></>}</div>}</div>; })}</div>
        <div className="status" role="status"><span className={`status-dot ${status}`}/>{status === 'loading' ? 'Loading the local model…' : status === 'error' ? 'Model unavailable' : status === 'analyzing' ? 'Reading your changes…' : 'Local model ready'}{status === 'ready' && ms !== null && <span className="latency">{ms} ms</span>}</div>
        {error && <p className="error">{error}</p>}<p className="footnote">Detected details are suggestions, not verification of a seller’s claims.</p>
      </aside></div>
      <footer><span>LEXICAL EDITOR</span><span>MiniLM · Question matching · Local WASM</span></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
