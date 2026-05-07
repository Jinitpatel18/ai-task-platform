import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚡</div>
        <h1 style={s.title}>Create Account</h1>
        <p style={s.sub}>Start processing AI tasks today</p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Username</label>
          <input style={s.input} name="username" type="text" value={form.username}
            onChange={handleChange} placeholder="johndoe" required minLength={3} />
          <label style={s.label}>Email</label>
          <input style={s.input} name="email" type="email" value={form.email}
            onChange={handleChange} placeholder="you@example.com" required />
          <label style={s.label}>Password</label>
          <input style={s.input} name="password" type="password" value={form.password}
            onChange={handleChange} placeholder="••••••••" required minLength={6} />
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={s.link}>Already have an account? <Link to="/login" style={s.a}>Sign in</Link></p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', padding: '1rem' },
  card: { background: '#1e1e30', border: '1px solid #2d2d4e', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  logo: { fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem' },
  title: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa', marginBottom: '0.25rem' },
  sub: { textAlign: 'center', color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' },
  label: { display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 },
  input: { width: '100%', padding: '0.75rem 1rem', marginBottom: '1rem', background: '#0f0f1a', border: '1px solid #2d2d4e', borderRadius: '8px', color: '#e2e8f0', fontSize: '1rem', outline: 'none' },
  btn: { width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' },
  error: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  link: { textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' },
  a: { color: '#a78bfa', textDecoration: 'none', fontWeight: 500 }
};
