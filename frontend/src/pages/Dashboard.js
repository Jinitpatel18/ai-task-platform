import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';

const STATUS_COLORS = {
  pending: '#f59e0b',
  running: '#3b82f6',
  success: '#10b981',
  failed: '#ef4444'
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get(`/tasks?page=${page}&limit=10`);
      setTasks(res.data.tasks);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    success: tasks.filter(t => t.status === 'success').length,
    failed: tasks.filter(t => t.status === 'failed').length
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>⚡</span>
          <span style={s.brand}>AI Task Platform</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.username}>👤 {user?.username}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main style={s.main}>
        {/* Stats */}
        <div style={s.statsRow}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{ ...s.statCard, borderColor: color }}>
              <div style={{ ...s.statNum, color }}>{stats[status] || 0}</div>
              <div style={s.statLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</div>
            </div>
          ))}
        </div>

        {/* Header row */}
        <div style={s.row}>
          <h2 style={s.sectionTitle}>Tasks ({total})</h2>
          <button style={s.createBtn} onClick={() => setShowModal(true)}>+ New Task</button>
        </div>

        {/* Task list */}
        {loading ? (
          <div style={s.center}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🚀</div>
            <p>No tasks yet. Create your first task!</p>
            <button style={s.createBtn} onClick={() => setShowModal(true)}>Create Task</button>
          </div>
        ) : (
          <div style={s.taskList}>
            {tasks.map(task => (
              <TaskCard key={task._id} task={task}
                onClick={() => navigate(`/tasks/${task._id}`)}
                onRefresh={fetchTasks}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div style={s.pagination}>
            <button style={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={s.pageInfo}>Page {page} of {Math.ceil(total / 10)}</span>
            <button style={s.pageBtn} disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </main>

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchTasks(); }}
        />
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#0f0f1a' },
  header: { background: '#1e1e30', borderBottom: '1px solid #2d2d4e', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logo: { fontSize: '1.5rem' },
  brand: { fontSize: '1.2rem', fontWeight: 700, color: '#a78bfa' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  username: { color: '#94a3b8', fontSize: '0.9rem' },
  logoutBtn: { background: 'transparent', border: '1px solid #2d2d4e', color: '#94a3b8', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
  main: { maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: '#1e1e30', border: '1px solid', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' },
  statNum: { fontSize: '2rem', fontWeight: 700 },
  statLabel: { color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' },
  sectionTitle: { fontSize: '1.2rem', fontWeight: 600, color: '#e2e8f0' },
  createBtn: { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  taskList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b' },
  empty: { textAlign: 'center', padding: '3rem', color: '#64748b' },
  emptyIcon: { fontSize: '3rem', marginBottom: '1rem' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem' },
  pageBtn: { background: '#1e1e30', border: '1px solid #2d2d4e', color: '#e2e8f0', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' },
  pageInfo: { color: '#64748b', fontSize: '0.9rem' }
};
