import React from 'react';

const STATUS_COLORS = { pending: '#f59e0b', running: '#3b82f6', success: '#10b981', failed: '#ef4444' };
const STATUS_ICONS = { pending: '⏳', running: '⚙️', success: '✅', failed: '❌' };

export default function TaskCard({ task, onClick }) {
  const color = STATUS_COLORS[task.status] || '#64748b';
  const icon = STATUS_ICONS[task.status] || '?';

  return (
    <div style={s.card} onClick={onClick}>
      <div style={s.left}>
        <div style={s.title}>{task.title}</div>
        <div style={s.meta}>
          <span style={s.op}>{task.operation.replace('_', ' ')}</span>
          <span style={s.date}>{new Date(task.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div style={{ ...s.status, color, borderColor: color }}>
        {icon} {task.status}
      </div>
    </div>
  );
}

const s = {
  card: { background: '#1e1e30', border: '1px solid #2d2d4e', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color 0.2s', ':hover': { borderColor: '#a78bfa' } },
  left: { flex: 1 },
  title: { fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' },
  meta: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  op: { background: '#0f0f1a', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 },
  date: { color: '#64748b', fontSize: '0.75rem' },
  status: { border: '1px solid', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }
};
