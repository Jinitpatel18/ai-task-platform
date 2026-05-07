import React, { useState } from 'react';
import api from '../utils/api';

const OPERATIONS = [
  { value: 'uppercase', label: '🔠 Uppercase' },
  { value: 'lowercase', label: '🔡 Lowercase' },
  { value: 'reverse', label: '🔄 Reverse String' },
  { value: 'word_count', label: '🔢 Word Count' }
];

export default function CreateTaskModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', inputText: '', operation: 'uppercase' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/tasks', form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Create New Task</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Task Title</label>
          <input style={s.input} name="title" value={form.title}
            onChange={handleChange} placeholder="e.g. Process user feedback" required maxLength={100} />

          <label style={s.label}>Operation</label>
          <select style={s.input} name="operation" value={form.operation} onChange={handleChange}>
            {OPERATIONS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <label style={s.label}>Input Text</label>
          <textarea style={{ ...s.input, height: '120px', resize: 'vertical' }}
            name="inputText" value={form.inputText}
            onChange={handleChange} placeholder="Enter the text to process..." required maxLength={10000} />

          <div style={s.btnRow}>
            <button type="button" style={s.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? 'Creating...' : '⚡ Run Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: '#1e1e30', border: '1px solid #2d2d4e', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  modalTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#e2e8f0' },
  closeBtn: { background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' },
  label: { display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 },
  input: { width: '100%', padding: '0.75rem 1rem', marginBottom: '1rem', background: '#0f0f1a', border: '1px solid #2d2d4e', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit' },
  error: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  btnRow: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: { background: 'transparent', border: '1px solid #2d2d4e', color: '#94a3b8', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 },
  submitBtn: { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }
};
