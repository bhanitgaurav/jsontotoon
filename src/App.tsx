import React, { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import ReactJson from 'react-json-view';
import { FileJson, FileCode, Copy, Scissors, Clipboard, Play, AlertCircle, Wand2, Trash2, Stethoscope, Heart, Monitor, Sun, Moon, Eye, Edit, RotateCcw, RotateCw, X, Mail, MessageSquare, Send } from 'lucide-react';
import { formatJson, validateJson } from './utils/jsonUtils';
import { convertToToon } from './utils/toonUtils';
import { repairJson } from './utils/jsonRepairUtils';

type Theme = 'system' | 'light' | 'dark';
type ViewMode = 'editor' | 'preview';

function App() {
  const [jsonInput, setJsonInput] = useState('');
  const [toonOutput, setToonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [parsedJson, setParsedJson] = useState<object>({});

  // Contact Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ email: '', message: '' });
  const [formErrors, setFormErrors] = useState({ email: '', message: '' });

  const editorRef = useRef<any>(null);

  useEffect(() => {
    const root = document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = theme === 'system' ? systemTheme : theme;

    root.setAttribute('data-theme', activeTheme);
  }, [theme]);

  const toggleTheme = () => {
    const themes: Theme[] = ['system', 'light', 'dark'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} />;
      case 'dark': return <Moon size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleFormat = () => {
    try {
      if (!jsonInput.trim()) return;
      const formatted = formatJson(jsonInput);
      setJsonInput(formatted);
      editorRef.current?.setValue(formatted);
      setError(null);
    } catch (err) {
      setError('Invalid JSON: Unable to format');
    }
  };

  const handleRepair = () => {
    try {
      if (!jsonInput.trim()) return;
      const repaired = repairJson(jsonInput);
      setJsonInput(repaired);
      editorRef.current?.setValue(repaired);
      setError(null);
    } catch (err) {
      setError('Repair Failed: Unable to fix JSON');
    }
  };

  const handleConvertToToon = () => {
    try {
      if (!jsonInput.trim()) return;

      // Try to repair first if invalid, or just validate
      let inputToConvert = jsonInput;
      if (!validateJson(jsonInput)) {
        try {
          inputToConvert = repairJson(jsonInput);
        } catch (e) {
          setError('Invalid JSON: Please fix errors before converting');
          return;
        }
      }

      const toon = convertToToon(inputToConvert);
      setToonOutput(toon);
      setError(null);
    } catch (err) {
      setError('Conversion Failed: ' + (err as Error).message);
    }
  };

  const handleCopy = () => {
    if (editorRef.current) {
      const value = editorRef.current.getValue();
      navigator.clipboard.writeText(value);
    }
  };

  const handleCut = () => {
    if (editorRef.current) {
      const value = editorRef.current.getValue();
      navigator.clipboard.writeText(value);
      editorRef.current.setValue('');
      setJsonInput('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (editorRef.current) {
        editorRef.current.setValue(text);
        setJsonInput(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
      setJsonInput('');
      setError(null);
    }
  };

  const handleUndo = () => {
    editorRef.current?.trigger('toolbar', 'undo', null);
  };

  const handleRedo = () => {
    editorRef.current?.trigger('toolbar', 'redo', null);
  };

  const toggleViewMode = (mode: ViewMode) => {
    if (mode === 'preview') {
      try {
        if (!jsonInput.trim()) {
          setParsedJson({});
          setViewMode('preview');
          return;
        }
        const parsed = JSON.parse(jsonInput);
        setParsedJson(parsed);
        setViewMode('preview');
        setError(null);
      } catch (e) {
        setError('Invalid JSON: Cannot switch to Preview mode');
      }
    } else {
      setViewMode('editor');
    }
  };

  const formatSize = (str: string) => {
    const bytes = new Blob([str]).size;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleContactSubmit = () => {
    const errors = { email: '', message: '' };
    let isValid = true;

    if (!contactForm.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(contactForm.email)) {
      errors.email = 'Email is invalid';
      isValid = false;
    }

    if (!contactForm.message) {
      errors.message = 'Message is required';
      isValid = false;
    }

    setFormErrors(errors);

    if (isValid) {
      const subject = encodeURIComponent('Feedback/Contact from JSON to TOON App');
      const body = encodeURIComponent(`From: ${contactForm.email}\n\nMessage:\n${contactForm.message}`);
      window.location.href = `mailto:bhanitgauravapps@gmail.com?subject=${subject}&body=${body}`;
      setIsModalOpen(false);
      setContactForm({ email: '', message: '' });
    }
  };

  return (
    <>
      <header className="header">
        <div className="title">
          <FileJson size={24} />
          <span>JSON to TOON</span>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={toggleTheme} title={`Theme: ${theme}`}>
            {getThemeIcon()}
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <button className="btn" onClick={handleUndo} title="Undo">
            <RotateCcw size={16} />
          </button>
          <button className="btn" onClick={handleRedo} title="Redo">
            <RotateCw size={16} />
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <button className="btn" onClick={handleClear} title="Clear">
            <Trash2 size={16} /> Clear
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <button className="btn" onClick={handleFormat} title="Format JSON">
            <Play size={16} /> Format
          </button>
          <button className="btn" onClick={handleRepair} title="Analyze & Correct JSON">
            <Stethoscope size={16} /> Analyze & Correct
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <button className="btn" onClick={handleCopy} title="Copy">
            <Copy size={16} /> Copy
          </button>
          <button className="btn" onClick={handleCut} title="Cut">
            <Scissors size={16} /> Cut
          </button>
          <button className="btn" onClick={handlePaste} title="Paste (Replaces Content)">
            <Clipboard size={16} /> Paste
          </button>
          <div style={{ width: '1px', background: 'var(--border)', margin: '0 0.5rem' }} />
          <button className="btn btn-primary" onClick={handleConvertToToon}>
            <Wand2 size={16} /> Convert to TOON
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="pane">
          <div className="pane-header" style={{ padding: 0 }}>
            <div className="tabs">
              <button
                className={`tab ${viewMode === 'editor' ? 'active' : ''}`}
                onClick={() => toggleViewMode('editor')}
              >
                <Edit size={14} /> Editor
              </button>
              <button
                className={`tab ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={() => toggleViewMode('preview')}
              >
                <Eye size={14} /> Preview
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: 'auto', marginRight: '1rem' }}>
              {viewMode === 'editor' ? 'Auto-detects errors' : 'Read-only'}
            </span>
          </div>
          <div className="editor-container">
            {viewMode === 'editor' ? (
              <Editor
                height="100%"
                defaultLanguage="json"
                theme={theme === 'light' ? 'light' : 'vs-dark'}
                value={jsonInput}
                onChange={(value) => {
                  setJsonInput(value || '');
                  if (error) setError(null);
                }}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            ) : (
              <div style={{ padding: '1rem', overflow: 'auto', height: '100%', background: theme === 'light' ? '#fff' : '#1e1e1e' }}>
                <ReactJson
                  src={parsedJson}
                  theme={theme === 'light' ? 'rjv-default' : 'monokai'}
                  style={{ background: 'transparent' }}
                  displayDataTypes={false}
                />
              </div>
            )}
          </div>
          <div className="pane-status-bar">
            Size: {formatSize(jsonInput)}
          </div>
        </div>

        <div className="pane">
          <div className="pane-header">
            <span>TOON Output</span>
            <FileCode size={16} />
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="text"
              theme={theme === 'light' ? 'light' : 'vs-dark'}
              value={toonOutput}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
          <div className="pane-status-bar">
            Size: {formatSize(toonOutput)}
          </div>
        </div>
      </main>

      <footer className="footer">
        Made with <Heart size={14} fill="#ef4444" color="#ef4444" style={{ margin: '0 4px' }} /> by Bhanit Gaurav
        <span style={{ margin: '0 0.5rem', color: 'var(--border)' }}>|</span>
        <button className="footer-link" onClick={() => setIsModalOpen(true)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}>
          Contact / Help
        </button>
      </footer>

      {/* Contact Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} /> Contact / Help
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={14} /> Your Email
                </div>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              />
              {formErrors.email && <div className="form-error">{formErrors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea"
                placeholder="How can we help you?"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              />
              {formErrors.message && <div className="form-error">{formErrors.message}</div>}
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleContactSubmit}>
                <Send size={16} /> Send
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
