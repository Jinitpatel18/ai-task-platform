import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const STATUS_COLORS = { pending: '#f59e0b', running: '#3b82f6', success: '#10b981', failed: '#ef4444' };
const STATUS_ICONS = { pending: '⏳', running: '⚙️', success: '✅', failed: '❌' };

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTask = useCallback(async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data.task);
    } catch (err) {
      setError(err.response?.data?.error || 'Task not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
    let interval;
    // Poll while running
    interval = setInterval(() => {
      if (task?.status === 'pending' || task?.status === 'running') fetchTask();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchTask, task?.status]);

  if (loading) return <div style={s.center}>Loading...</div>;
  if (error) return <div style={s.center}>{error}</div>;
  if (!task) return null;

  const statusColor = STATUS_COLORS[task.status] || '#64748b';

  return (
    <div style={s.page}>
      <div style={s.container}>
        <button style={s.backBtn} onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>

        <div style={s.header}>
          <div>
            <h1 style={s.title}>{task.title}</h1>
            <div style={s.meta}>
              <span style={s.operation}>{task.operation}</span>
              <span style={{ ...s.status, color: statusColor, borderColor: statusColor }}>
                {STATUS_ICONS[task.status]} {task.status}
              </span>
            </div>
          </div>
        </div>

        <div style={s.grid}>
          {/* Input */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📥 Input Text</h3>
            <pre style={s.pre}>{task.inputText}</pre>
          </div>

          {/* Result */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📤 Result</h3>
            {task.result !== null ? (
              <pre style={{ ...s.pre, color: '#10b981' }}>{task.result}</pre>
            ) : (
              <p style={s.noResult}>
                {task.status === 'failed' ? `Error: ${task.errorMessage}` : 'Processing...'}
              </p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>⏱ Timing</h3>
          <div style={s.timeGrid}>
            <div><span style={s.timeLabel}>Created</span><br />{new Date(task.createdAt).toLocaleString()}</div>
            {task.startedAt && <div><span style={s.timeLabel}>Started</span><br />{new Date(task.startedAt).toLocaleString()}</div>}
            {task.completedAt && <div><span style={s.timeLabel}>Completed</span><br />{new Date(task.completedAt).toLocaleString()}</div>}
          </div>
        </div>

        {/* Logs */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>📋 Logs</h3>
          <div style={s.logBox}>
            {task.logs?.length === 0 ? (
              <p style={{ color: '#64748b' }}>No logs yet.</p>
            ) : (
              task.logs.map((log, i) => (
                <div key={i} style={{ ...s.logLine, color: log.level === 'error' ? '#fca5a5' : log.level === 'warn' ? '#fcd34d' : '#a3e635' }}>
                  <span style={s.logTime}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {' '}{log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0f0f1a', padding: '2rem 1rem' },
  container: { maxWidth: '800px', margin: '0 auto' },
  center: { textAlign: 'center', padding: '5rem', color: '#64748b', minHeight: '100vh', background: '#0f0f1a' },
  backBtn: { background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '1.5rem', padding: 0 },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.6rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' },
  meta: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  operation: { background: '#2d2d4e', color: '#a78bfa', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 },
  status: { border: '1px solid', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  card: { background: '#1e1e30', border: '1px solid #2d2d4e', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' },
  cardTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  pre: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.9rem', background: '#0f0f1a', padding: '0.75rem', borderRadius: '6px' },
  noResult: { color: '#64748b', fontStyle: 'italic' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', color: '#e2e8f0', fontSize: '0.85rem' },
  timeLabel: { color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  logBox: { background: '#0a0a14', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', maxHeight: '300px', overflowY: 'auto' },
  logLine: { marginBottom: '0.25rem' },
  logTime: { color: '#475569' }
};
