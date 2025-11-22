import { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import ReactJson from 'react-json-view';
import { FileJson, FileCode, Copy, Scissors, Clipboard, Play, AlertCircle, Wand2, Trash2, Stethoscope, Heart, Monitor, Sun, Moon, Eye, Edit, RotateCcw, RotateCw, X, Mail, MessageSquare, Send, ArrowLeftRight, Rocket } from 'lucide-react';
import { formatJson, validateJson } from './utils/jsonUtils';
import { convertToToon, convertToJson, validateToon } from './utils/toonUtils';
import { repairJson } from './utils/jsonRepairUtils';

type Theme = 'system' | 'light' | 'dark' | 'space';
type ViewMode = 'editor' | 'preview';
type ConversionMode = 'json-to-toon' | 'toon-to-json';

function App() {
  const [inputContent, setInputContent] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [parsedPreview, setParsedPreview] = useState<object>({});
  const [conversionMode, setConversionMode] = useState<ConversionMode>('json-to-toon');

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
    const themes: Theme[] = ['system', 'light', 'dark', 'space'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={16} />;
      case 'dark': return <Moon size={16} />;
      case 'space': return <Rocket size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleFormat = () => {
    try {
      if (!inputContent.trim()) return;

      if (conversionMode === 'json-to-toon') {
        const formatted = formatJson(inputContent);
        setInputContent(formatted);
        editorRef.current?.setValue(formatted);
      } else {
        // Check if it's JSON first
        if (validateJson(inputContent)) {
          setError('Input appears to be JSON. Switch to "JSON to TOON" mode to format.');
          return;
        }

        // Check if it's valid TOON
        if (!validateToon(inputContent)) {
          setError('Invalid TOON format: Check indentation (2 spaces) and syntax (key: value or - item)');
          return;
        }

        // Round trip format: TOON -> JSON -> TOON
        const json = convertToJson(inputContent);
        const toon = convertToToon(json);
        setInputContent(toon);
        editorRef.current?.setValue(toon);
      }
      setError(null);
    } catch (err) {
      setError('Unable to format: ' + (err as Error).message);
    }
  };

  const handleRepair = () => {
    if (conversionMode !== 'json-to-toon') return; // Only for JSON
    try {
      if (!inputContent.trim()) return;
      const repaired = repairJson(inputContent);
      setInputContent(repaired);
      editorRef.current?.setValue(repaired);
      setError(null);
    } catch (err) {
      setError('Repair Failed: Unable to fix JSON');
    }
  };

  const handleConvert = () => {
    try {
      if (!inputContent.trim()) return;

      if (conversionMode === 'json-to-toon') {
        // Try to repair first if invalid, or just validate
        let inputToConvert = inputContent;
        if (!validateJson(inputContent)) {
          try {
            inputToConvert = repairJson(inputContent);
          } catch (e) {
            setError('Invalid JSON: Please fix errors before converting');
            return;
          }
        }
        const toon = convertToToon(inputToConvert);
        setOutputContent(toon);
      } else {
        // TOON to JSON
        if (!validateToon(inputContent)) {
          setError('Invalid TOON format: Check indentation (2 spaces) and syntax (key: value or - item)');
          return;
        }
        const json = convertToJson(inputContent);
        // Format the JSON output
        const formattedJson = formatJson(json);
        setOutputContent(formattedJson);
      }
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
      setInputContent('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (editorRef.current) {
        editorRef.current.setValue(text);
        setInputContent(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
      setInputContent('');
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
        if (!inputContent.trim()) {
          setParsedPreview({});
          setViewMode('preview');
          return;
        }

        let jsonObject;
        if (conversionMode === 'json-to-toon') {
          jsonObject = JSON.parse(inputContent);
        } else {
          // Parse TOON to JSON for preview
          const jsonStr = convertToJson(inputContent);
          jsonObject = JSON.parse(jsonStr);
        }

        setParsedPreview(jsonObject);
        setViewMode('preview');
        setError(null);
      } catch (e) {
        setError('Invalid Content: Cannot switch to Preview mode');
      }
    } else {
      setViewMode('editor');
    }
  };

  const toggleConversionMode = () => {
    setConversionMode(prev => prev === 'json-to-toon' ? 'toon-to-json' : 'json-to-toon');
    // Swap content? No, usually user wants to start fresh or convert what they have.
    // Let's clear for safety or keep? Keeping might be confusing if format mismatches.
    // Let's clear.
    setInputContent('');
    setOutputContent('');
    if (editorRef.current) editorRef.current.setValue('');
    setError(null);
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
          <span>{conversionMode === 'json-to-toon' ? 'JSON to TOON' : 'TOON to JSON'}</span>
          <button
            className="btn"
            onClick={toggleConversionMode}
            title="Switch Direction"
            style={{ marginLeft: '0.5rem', padding: '4px' }}
          >
            <ArrowLeftRight size={16} />
          </button>
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
          <button className="btn" onClick={handleFormat} title="Format">
            <Play size={16} /> Format
          </button>
          {conversionMode === 'json-to-toon' && (
            <button className="btn" onClick={handleRepair} title="Analyze & Correct JSON">
              <Stethoscope size={16} /> Analyze & Correct
            </button>
          )}
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
          <button className="btn btn-primary" onClick={handleConvert}>
            <Wand2 size={16} /> {conversionMode === 'json-to-toon' ? 'Convert to TOON' : 'Convert to JSON'}
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
              {conversionMode === 'json-to-toon' ? 'JSON Input' : 'TOON Input'}
            </span>
          </div>
          <div className="editor-container">
            {viewMode === 'editor' ? (
              <Editor
                height="100%"
                defaultLanguage={conversionMode === 'json-to-toon' ? 'json' : 'text'}
                theme={theme === 'light' ? 'light' : 'vs-dark'}
                value={inputContent}
                onChange={(value) => {
                  setInputContent(value || '');
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
                  src={parsedPreview}
                  theme={theme === 'light' ? 'rjv-default' : 'monokai'}
                  style={{ background: 'transparent' }}
                  displayDataTypes={false}
                />
              </div>
            )}
          </div>
          <div className="pane-status-bar">
            Size: {formatSize(inputContent)}
          </div>
        </div>

        <div className="pane">
          <div className="pane-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{conversionMode === 'json-to-toon' ? 'TOON Output' : 'JSON Output'}</span>
              <FileCode size={16} />
            </div>
            <button
              className="btn"
              onClick={() => { navigator.clipboard.writeText(outputContent); }}
              title="Copy Output"
              style={{ padding: '2px 6px', height: '24px', fontSize: '0.75rem' }}
            >
              <Copy size={12} /> Copy
            </button>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage={conversionMode === 'json-to-toon' ? 'text' : 'json'}
              theme={theme === 'light' ? 'light' : 'vs-dark'}
              value={outputContent}
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
            Size: {formatSize(outputContent)}
          </div>
        </div>
      </main>

      <section className="content-section">
        <div className="content-container">
          <h2>What is TOON?</h2>
          <p>
            TOON (Token-Oriented Object Notation) is a concise, human-readable data format designed as an alternative to JSON.
            It simplifies configuration files and data serialization by removing unnecessary quotes, brackets, and commas,
            making it easier to read and write while maintaining a structured hierarchy.
          </p>

          <h2>Why use this JSON to TOON Converter?</h2>
          <p>
            Our free online converter provides a seamless way to switch between JSON and TOON formats. Whether you are a developer
            looking to simplify your config files or just exploring new data formats, this tool offers:
          </p>
          <ul>
            <li><strong>Bidirectional Conversion:</strong> Instantly convert JSON to TOON and TOON to JSON.</li>
            <li><strong>Real-time Validation:</strong> Automatically detects errors in your input to prevent invalid conversions.</li>
            <li><strong>Privacy Focused:</strong> All conversions happen 100% client-side in your browser. Your data never leaves your device.</li>
            <li><strong>Developer Friendly:</strong> Features like syntax highlighting, copy-to-clipboard, and a dark "Space" theme.</li>
          </ul>

          <h2>Frequently Asked Questions</h2>

          <div className="faq-item">
            <div className="faq-question">Is this tool free?</div>
            <div className="faq-answer">Yes, this JSON to TOON converter is completely free to use for both personal and commercial projects.</div>
          </div>

          <div className="faq-item">
            <div className="faq-question">Is my data safe?</div>
            <div className="faq-answer">Absolutely. We process all data locally in your browser using JavaScript. No data is sent to any server.</div>
          </div>

          <div className="faq-item">
            <div className="faq-question">Who created this tool?</div>
            <div className="faq-answer">
              This tool was built by <a href="https://bhanitgaurav.com" target="_blank" rel="noopener noreferrer" className="content-link">Bhanit Gaurav</a>,
              a passionate developer dedicated to building useful open-source tools. Check out more on <a href="https://github.com/bhanitgaurav" target="_blank" rel="noopener noreferrer" className="content-link">GitHub</a>.
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        Made with <Heart size={14} fill="#ef4444" color="#ef4444" style={{ margin: '0 4px' }} /> by Bhanit Gaurav
        <span style={{ margin: '0 0.5rem', color: 'var(--border)' }}>|</span>
        <button className="footer-link" onClick={() => { setIsModalOpen(true); setError(null); setFormErrors({ email: '', message: '' }); }} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit' }}>
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
