import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, XCircle, Clock, Eye, Search,
  RefreshCw, LogIn, LogOut, Newspaper, Users, TrendingUp,
  ChevronDown, ChevronUp, Loader2, AlertTriangle, Plus,
  Trash2, Edit3, X, Save, Tag
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// ─── Admin password (change this!) ──────────────────────────
const ADMIN_PASSWORD = 'cyberhx@admin2025';
// ────────────────────────────────────────────────────────────

const sbHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
});

async function sbGet(table: string, params: Record<string, string> = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: sbHeaders() });
  return res.json();
}

async function sbRpc(fn: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(body),
  });
  return { ok: res.ok };
}

async function sbDelete(table: string, id: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  });
  return { ok: res.ok };
}

async function sbPatch(table: string, id: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify(body),
  });
  return { ok: res.ok };
}

interface Submission {
  id: string; title: string; excerpt: string; content: string;
  category: string; tags: string[]; author_name: string;
  author_email: string; author_role: string; cover_image: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
}

interface BlogPost {
  id: string; title: string; slug: string; category: string;
  author_name: string; published_at: string; views: number;
  likes: number; featured: boolean; status: string;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_COLORS = {
  pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
};

// ─── Login Screen ─────────────────────────────────────────────
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('cyberhx_admin', '1');
      onLogin();
    } else {
      setError('Wrong password. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#05080f] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#0a0f1a] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#a3e635]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#a3e635]/20">
            <Shield size={32} className="text-[#a3e635]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">CyberHx Security Blog</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-medium mb-1.5 block">Admin Password</label>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter password"
              className="w-full bg-[#05080f] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50 transition-colors" />
          </div>
          {error && <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertTriangle size={14} />{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Submission Card ──────────────────────────────────────────
const SubmissionCard = ({ sub, onApprove, onReject, onDelete, loading }: {
  sub: Submission; onApprove: () => void; onReject: () => void;
  onDelete: () => void; loading: string | null;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${STATUS_COLORS[sub.status]}`}>
                {sub.status}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/8">{sub.category}</span>
            </div>
            <h3 className="text-white font-semibold text-base leading-tight">{sub.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Users size={13} />{sub.author_name}</span>
          <span>•</span>
          <span>{sub.author_role}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Clock size={13} />{fmtDate(sub.submitted_at)}</span>
        </div>

        <p className="text-gray-400 text-sm line-clamp-2 mb-4">{sub.excerpt}</p>

        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 bg-[#05080f] rounded-xl p-4 border border-white/5">
            <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{sub.content}</p>
            {sub.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sub.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20">#{t}</span>)}
              </div>
            )}
            {sub.author_email && (
              <p className="text-gray-500 text-xs mt-3">📧 {sub.author_email}</p>
            )}
          </motion.div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {sub.status === 'pending' && (
            <>
              <button onClick={onApprove} disabled={!!loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors text-sm font-medium disabled:opacity-50">
                {loading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Approve & Publish
              </button>
              <button onClick={onReject} disabled={!!loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors text-sm font-medium disabled:opacity-50">
                {loading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject
              </button>
            </>
          )}
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/8 transition-colors text-sm">
            {expanded ? <><ChevronUp size={14} />Less</> : <><ChevronDown size={14} />Read Full</>}
          </button>
          <button onClick={onDelete} disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm ml-auto">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Admin Panel ─────────────────────────────────────────
const AdminPage: React.FC = () => {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cyberhx_admin') === '1');
  const [tab, setTab] = useState<'submissions' | 'posts'>('submissions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, published: 0 });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, ps] = await Promise.all([
        sbGet('article_submissions', { select: '*', order: 'submitted_at.desc' }),
        sbGet('blog_posts', { select: 'id,title,slug,category,author_name,published_at,views,likes,featured,status', order: 'published_at.desc', limit: '50' }),
      ]);
      if (Array.isArray(subs)) {
        setSubmissions(subs);
        setStats({
          total: subs.length,
          pending: subs.filter((s: Submission) => s.status === 'pending').length,
          approved: subs.filter((s: Submission) => s.status === 'approved').length,
          published: Array.isArray(ps) ? ps.length : 0,
        });
      }
      if (Array.isArray(ps)) setPosts(ps);
    } catch (e) { showToast('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  const handleApprove = async (id: string) => {
    setActionLoading(a => ({ ...a, [id]: 'approve' }));
    const { ok } = await sbRpc('approve_submission', { sub_id: id });
    if (ok) { showToast('✅ Article published!'); loadData(); }
    else showToast('❌ Failed to approve');
    setActionLoading(a => ({ ...a, [id]: null }));
  };

  const handleReject = async (id: string) => {
    setActionLoading(a => ({ ...a, [id]: 'reject' }));
    const { ok } = await sbRpc('reject_submission', { sub_id: id });
    if (ok) { showToast('Article rejected'); loadData(); }
    else showToast('❌ Failed to reject');
    setActionLoading(a => ({ ...a, [id]: null }));
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm('Delete this submission?')) return;
    setActionLoading(a => ({ ...a, [id]: 'delete' }));
    const { ok } = await sbDelete('article_submissions', id);
    if (ok) { showToast('Deleted'); loadData(); }
    setActionLoading(a => ({ ...a, [id]: null }));
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Delete this published post? This cannot be undone.')) return;
    const { ok } = await sbDelete('blog_posts', id);
    if (ok) { showToast('Post deleted'); loadData(); }
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    const { ok } = await sbPatch('blog_posts', post.id, { featured: !post.featured });
    if (ok) { showToast(post.featured ? 'Removed from featured' : '⭐ Added to featured'); loadData(); }
  };

  const filteredSubs = submissions.filter(s => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.author_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#05080f] pt-14 sm:pt-16">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#0a0f1a] border border-[#a3e635]/30 text-[#a3e635] px-5 py-2.5 rounded-xl text-sm font-medium z-50 shadow-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Shield size={28} className="text-[#a3e635]" />Admin Panel
            </h1>
            <p className="text-gray-500 text-sm mt-1">CyberHx Security Blog — Content Management</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a0f1a] border border-white/8 text-gray-400 hover:text-white transition-colors text-sm">
              <RefreshCw size={15} />Refresh
            </button>
            <button onClick={() => { sessionStorage.removeItem('cyberhx_admin'); setAuthed(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm">
              <LogOut size={15} />Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Submissions', value: stats.total, color: 'text-white', icon: <Newspaper size={18} /> },
            { label: 'Pending Review', value: stats.pending, color: 'text-yellow-400', icon: <Clock size={18} /> },
            { label: 'Approved', value: stats.approved, color: 'text-green-400', icon: <CheckCircle size={18} /> },
            { label: 'Published Posts', value: stats.published, color: 'text-[#a3e635]', icon: <TrendingUp size={18} /> },
          ].map(s => (
            <div key={s.label} className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4">
              <div className={`flex items-center gap-2 mb-2 ${s.color}`}>{s.icon}<span className="text-xs font-medium text-gray-500">{s.label}</span></div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['submissions', 'posts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all capitalize border ${tab === t ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`}>
              {t === 'submissions' ? `Submissions ${stats.pending > 0 ? `(${stats.pending} pending)` : ''}` : 'Published Posts'}
            </button>
          ))}
        </div>

        {tab === 'submissions' && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search submissions…"
                  className="w-full bg-[#0a0f1a] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/40" />
              </div>
              <div className="flex gap-2">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all capitalize border ${filterStatus === s ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24"><Loader2 size={32} className="text-[#a3e635] animate-spin" /></div>
            ) : filteredSubs.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <CheckCircle size={48} className="mx-auto mb-4 text-gray-700" />
                <p className="font-medium">No {filterStatus !== 'all' ? filterStatus : ''} submissions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubs.map(sub => (
                  <SubmissionCard key={sub.id} sub={sub}
                    onApprove={() => handleApprove(sub.id)}
                    onReject={() => handleReject(sub.id)}
                    onDelete={() => handleDeleteSub(sub.id)}
                    loading={actionLoading[sub.id] ?? null} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'posts' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-24"><Loader2 size={32} className="text-[#a3e635] animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {posts.map(post => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">published</span>
                        <span className="text-xs text-gray-600">{post.category}</span>
                        {post.featured && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">⭐ Featured</span>}
                      </div>
                      <h3 className="text-white font-medium text-sm truncate">{post.title}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">{post.author_name} · {fmtDate(post.published_at)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye size={12} />{post.views}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleToggleFeatured(post)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${post.featured ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25' : 'bg-white/5 text-gray-400 border-white/8 hover:text-yellow-400'}`}>
                        {post.featured ? 'Unfeature' : '⭐ Feature'}
                      </button>
                      <button onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
