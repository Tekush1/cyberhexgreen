import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Eye, Heart,
  Share2, Shield, TrendingUp, Clock,
  Plus, ChevronRight, X, ArrowUp, Send,
  Loader2, WifiOff, LayoutGrid, LayoutList,
  Flame, Newspaper, Upload, Filter,
  CheckCircle, AlertCircle,
  AlertTriangle, ImagePlus, Link2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  cover_image: string;
  category: string;
  tags: string[];
  author_name: string;
  author_avatar: string;
  author_role: string;
  published_at: string;
  read_time: number;
  views: number;
  likes: number;
  comments_count: number;
  featured: boolean;
  shares?: number;
}

interface Category { id: string; name: string; slug: string; }

// ─── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const PAGE_SIZE = 12;
const IS_CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_PROJECT'));

const getSessionId = () => {
  let sid = localStorage.getItem('cyberhx_sid');
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('cyberhx_sid', sid); }
  return sid;
};

// ─── Supabase REST helpers ─────────────────────────────────────────────────────
async function sbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  });
  const count = parseInt(res.headers.get('content-range')?.split('/')[1] ?? '0', 10);
  const data = await res.json();
  return { data, count, ok: res.ok };
}

async function sbPost(path: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status };
}

async function sbRpc(fn: string, body: object) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = res.headers.get('content-length') !== '0' ? await res.json().catch(() => null) : null;
  return { ok: res.ok, data };
}

// ─── Category color map ────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; accent: string }> = {
  'Scam Alert':          { bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400',     accent: 'border-l-red-500' },
  'Malware Analysis':    { bg: 'bg-purple-500/15',  text: 'text-purple-400',  border: 'border-purple-500/30',  dot: 'bg-purple-400',  accent: 'border-l-purple-500' },
  'Fraud Investigation': { bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  accent: 'border-l-orange-500' },
  'Social Engineering':  { bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  accent: 'border-l-yellow-500' },
  'Email Security':      { bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30',    dot: 'bg-blue-400',    accent: 'border-l-blue-500' },
  'Web Security':        { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-400',    accent: 'border-l-cyan-500' },
  'Mobile Security':     { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', accent: 'border-l-emerald-500' },
  'CTF Writeups':        { bg: 'bg-lime-500/15',    text: 'text-lime-400',    border: 'border-lime-500/30',    dot: 'bg-lime-400',    accent: 'border-l-lime-500' },
  'News & Updates':      { bg: 'bg-sky-500/15',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-400',     accent: 'border-l-sky-500' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30', dot: 'bg-gray-400', accent: 'border-l-gray-500' };
const getCat = (cat: string) => CAT_COLORS[cat] ?? DEFAULT_COLOR;

// ─── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_CATEGORIES: Category[] = [
  { id: '0', name: 'All Posts', slug: 'all' },
  { id: '1', name: 'Scam Alert', slug: 'scam-alert' },
  { id: '2', name: 'Malware Analysis', slug: 'malware-analysis' },
  { id: '3', name: 'Fraud Investigation', slug: 'fraud-investigation' },
  { id: '4', name: 'Social Engineering', slug: 'social-engineering' },
  { id: '5', name: 'Email Security', slug: 'email-security' },
  { id: '6', name: 'Web Security', slug: 'web-security' },
  { id: '7', name: 'CTF Writeups', slug: 'ctf-writeups' },
  { id: '8', name: 'News & Updates', slug: 'news-updates' },
];

const DEMO_POSTS: BlogPost[] = [
  { id: '1', slug: 'whatsapp-otp-scam', title: 'New WhatsApp Scam: Fake OTP Verification Links', excerpt: 'Discovered a sophisticated phishing campaign targeting WhatsApp users with fake OTP verification messages.', cover_image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80', category: 'Scam Alert', tags: ['WhatsApp', 'Phishing', 'OTP'], author_name: 'Kushagra Dwivedi', author_avatar: 'https://i.ibb.co/kscBzpxZ/Whats-App-Image-2025-07-01-at-1-02-59-AM.jpg', author_role: 'Security Researcher', published_at: '2025-01-15T00:00:00Z', read_time: 5, views: 1247, likes: 89, comments_count: 23, featured: true },
  { id: '2', slug: 'zeus-variant-banks', title: 'Banking Trojan Analysis: Zeus Variant Targeting Indian Banks', excerpt: 'Deep dive into a new Zeus banking trojan variant specifically designed to target major Indian banking institutions.', cover_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80', category: 'Malware Analysis', tags: ['Banking Trojan', 'Zeus', 'Malware'], author_name: 'Pankaj Kumar', author_avatar: 'https://media.licdn.com/dms/image/v2/D4D03AQEoIIJDEgVOKQ/profile-displayphoto-shrink_200_200/0/1722410387895', author_role: 'Malware Analyst', published_at: '2025-01-12T00:00:00Z', read_time: 8, views: 892, likes: 67, comments_count: 15, featured: false },
  { id: '3', slug: 'crypto-scam-exposed', title: 'Cryptocurrency Scam: Fake Investment Platform Exposed', excerpt: 'Investigation reveals how scammers are using fake cryptocurrency investment platforms to steal millions from unsuspecting investors.', cover_image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80', category: 'Fraud Investigation', tags: ['Cryptocurrency', 'Investment Scam', 'Fraud'], author_name: 'Shreya Shristi', author_avatar: 'https://i.ibb.co/609FPPt3/IMG-20250430-WA0002-1.jpg', author_role: 'Fraud Investigator', published_at: '2025-01-10T00:00:00Z', read_time: 6, views: 1456, likes: 112, comments_count: 34, featured: true },
  { id: '4', slug: 'social-media-takeover', title: 'Social Media Account Takeover: New Attack Vector', excerpt: 'Discovered a new method attackers are using to take over social media accounts through session hijacking and cookie manipulation.', cover_image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80', category: 'Social Engineering', tags: ['Social Media', 'Session Hijacking', 'Privacy'], author_name: 'Sejal Tiwari', author_avatar: 'https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg', author_role: 'Security Analyst', published_at: '2025-01-08T00:00:00Z', read_time: 4, views: 743, likes: 45, comments_count: 12, featured: false },
  { id: '5', slug: 'email-spoofing-corporate', title: 'Email Spoofing Campaign Targeting Corporate Executives', excerpt: 'Analysis of a sophisticated email spoofing campaign that successfully compromised several high-profile corporate accounts.', cover_image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&q=80', category: 'Email Security', tags: ['Email Spoofing', 'Corporate Security', 'Phishing'], author_name: 'Pragati Yadav', author_avatar: 'https://media.licdn.com/dms/image/v2/D5603AQG9nMfjIl9GSg/profile-displayphoto-shrink_200_200/0/1733457712693', author_role: 'Security Analyst', published_at: '2025-01-06T00:00:00Z', read_time: 7, views: 634, likes: 38, comments_count: 9, featured: false },
  { id: '6', slug: 'ctf-hackthebox-phantom', title: 'CTF Writeup: HackTheBox — Phantom Machine', excerpt: 'Detailed walkthrough of the Phantom Machine challenge from HackTheBox covering privilege escalation, SUID abuse and lateral movement.', cover_image: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800&q=80', category: 'CTF Writeups', tags: ['HackTheBox', 'Privilege Escalation', 'Linux'], author_name: 'Aarav Singh', author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80', author_role: 'CTF Player', published_at: '2025-01-04T00:00:00Z', read_time: 12, views: 2103, likes: 156, comments_count: 41, featured: true },
];

const TRENDING_TAGS = ['Phishing', 'WhatsApp', 'Banking', 'Malware', 'CTF', 'Ransomware', 'OTP Fraud', 'UPI Scam', 'Social Engineering', 'Linux'];
const SUBMIT_CATS = ['Scam Alert', 'Malware Analysis', 'Fraud Investigation', 'Social Engineering', 'Email Security', 'Web Security', 'Mobile Security', 'CTF Writeups', 'News & Updates'];

// ─── CategoryBadge ─────────────────────────────────────────────────────────────
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const c = getCat(category);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-medium text-xs ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {category}
    </span>
  );
};

// ─── FeaturedCard ──────────────────────────────────────────────────────────────
const FeaturedCard: React.FC<{ post: BlogPost; onClick: () => void }> = ({ post, onClick }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}
    onClick={onClick} className={`relative group cursor-pointer bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all border-l-4 ${getCat(post.category).accent}`}>
    <div className="relative h-40 overflow-hidden">
      <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={e => { (e.target as HTMLImageElement).src = 'https://i.ibb.co/gLcY5Nbm/Chat-GPT-Image-May-3-2026-04-46-05-PM.png'; }} loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-transparent" />
      <div className="absolute top-3 left-3"><CategoryBadge category={post.category} /></div>
    </div>
    <div className="p-4">
      <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-[#a3e635] transition-colors">{post.title}</h3>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1"><Eye size={11} />{post.views.toLocaleString()}</span>
        <span className="flex items-center gap-1"><Heart size={11} />{post.likes}</span>
        <span className="flex items-center gap-1"><Clock size={11} />{post.read_time}m</span>
      </div>
    </div>
  </motion.div>
);

// ─── PostCard ──────────────────────────────────────────────────────────────────
const PostCard: React.FC<{ post: BlogPost; onClick: () => void; viewMode: 'grid' | 'list'; liked: boolean }> = ({ post, onClick, viewMode, liked }) => {
  const isGrid = viewMode === 'grid';
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}
      onClick={onClick} className={`group cursor-pointer bg-[#0a0f1a] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all border-l-4 ${getCat(post.category).accent} ${isGrid ? '' : 'flex gap-0 sm:gap-4'}`}>
      <div className={`relative overflow-hidden flex-shrink-0 ${isGrid ? 'h-44 w-full' : 'h-28 sm:h-auto w-full sm:w-44'}`}>
        <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.target as HTMLImageElement).src = 'https://i.ibb.co/gLcY5Nbm/Chat-GPT-Image-May-3-2026-04-46-05-PM.png'; }} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent" />
      </div>
      <div className="p-4 flex flex-col gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={post.category} />
          {post.featured && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20 text-xs font-medium"><Flame size={9} /> Featured</span>}
        </div>
        <h3 className={`text-white font-semibold leading-snug group-hover:text-[#a3e635] transition-colors ${isGrid ? 'text-sm line-clamp-2' : 'text-sm sm:text-base line-clamp-2'}`}>{post.title}</h3>
        <p className={`text-gray-500 text-xs leading-relaxed ${isGrid ? 'line-clamp-2' : 'hidden sm:block sm:line-clamp-2'}`}>{post.excerpt}</p>
        <div className="flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5">#{tag}</span>)}
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <img src={post.author_avatar} alt={post.author_name} className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10"
              onError={e => { (e.target as HTMLImageElement).src = 'https://i.ibb.co/gLcY5Nbm/Chat-GPT-Image-May-3-2026-04-46-05-PM.png'; }} />
            <span className="text-gray-500 text-xs truncate">{post.author_name}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600 text-xs flex-shrink-0">
            <span className="flex items-center gap-1"><Eye size={11} />{post.views.toLocaleString()}</span>
            <span className={`flex items-center gap-1 ${liked ? 'text-red-400' : ''}`}><Heart size={11} className={liked ? 'fill-current' : ''} />{post.likes}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{post.read_time}m</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── SubmitArticleModal ────────────────────────────────────────────────────────
const SubmitArticleModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [form, setForm] = useState({
    title: '', excerpt: '', content: '', category: 'Scam Alert',
    tags: '', author_name: '', author_email: '', author_role: 'Contributor', cover_image: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url');
  const [uploadPreview, setUploadPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrMsg('Image 5MB se badi nahi honi chahiye.'); return; }
    if (!file.type.startsWith('image/')) { setErrMsg('Sirf image files allowed hain.'); return; }
    setErrMsg('');

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setUploadPreview(localUrl);

    if (!IS_CONFIGURED) {
      set('cover_image', localUrl);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/article-images/${filename}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': file.type,
            'x-upsert': 'true',
          },
          body: file,
        }
      );
      if (!res.ok) throw new Error('Upload failed');
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/article-images/${filename}`;
      set('cover_image', publicUrl);
      setUploadPreview(publicUrl);
    } catch {
      setErrMsg('Image upload failed. URL option use karo.');
      setUploadPreview('');
      set('cover_image', '');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.excerpt || !form.content || !form.author_name || !form.author_email) {
      setErrMsg('Please fill in all required fields.'); return;
    }
    setStatus('loading'); setErrMsg('');
    try {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (IS_CONFIGURED) {
        const { ok } = await sbPost('article_submissions', { ...form, tags: tagsArray });
        if (!ok) throw new Error('DB error');
      } else {
        await new Promise(r => setTimeout(r, 1200));
      }
      setStatus('success');
    } catch {
      setStatus('error'); setErrMsg('Submission failed. Please try again.');
    }
  };

  const inputCls = "w-full bg-[#05080f] border border-white/8 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50 transition-colors";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          className="bg-[#0a0f1a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

          {/* Header */}
          <div className="sticky top-0 bg-[#0a0f1a] border-b border-white/8 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-2xl">
            <div>
              <h2 className="text-lg font-bold text-white">Submit an Article</h2>
              <p className="text-gray-500 text-xs mt-0.5">Your research will be reviewed before publishing</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-white/8 transition-colors"><X size={18} /></button>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-[#a3e635]/15 flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-[#a3e635]" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">Article Submitted!</h3>
              <p className="text-gray-400 text-sm mb-6">Our team will review your submission and publish it soon. Thank you for contributing!</p>
              <button onClick={onClose} className="px-6 py-2.5 bg-[#a3e635] text-[#05080f] font-semibold rounded-xl hover:bg-[#bef264] transition-colors text-sm">Close</button>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Author info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Your Name *</label>
                  <input value={form.author_name} onChange={e => set('author_name', e.target.value)} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Email * <span className="text-gray-600 font-normal">(not published)</span></label>
                  <input type="email" value={form.author_email} onChange={e => set('author_email', e.target.value)} placeholder="your@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Role / Title</label>
                <input value={form.author_role} onChange={e => set('author_role', e.target.value)} placeholder="e.g. Security Researcher, CTF Player" className={inputCls} />
              </div>

              <hr className="border-white/6" />

              {/* Article info */}
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Article Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Clear, descriptive title" className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Category *</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                    {SUBMIT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-medium mb-1.5">Tags <span className="text-gray-600 font-normal">(comma separated)</span></label>
                  <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Phishing, OTP, WhatsApp" className={inputCls} />
                </div>
              </div>

              {/* ── Cover Image: URL or Upload ── */}
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-2">
                  Cover Image <span className="text-gray-600 font-normal">(optional)</span>
                </label>

                {/* Tab switcher */}
                <div className="flex gap-1 bg-[#05080f] border border-white/8 rounded-xl p-1 mb-3 w-fit">
                  <button
                    onClick={() => setImageTab('url')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${imageTab === 'url' ? 'bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Link2 size={12} /> URL
                  </button>
                  <button
                    onClick={() => setImageTab('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${imageTab === 'upload' ? 'bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30' : 'text-gray-500 hover:text-gray-300'}`}>
                    <ImagePlus size={12} /> Upload
                  </button>
                </div>

                {imageTab === 'url' ? (
                  <>
                    <input
                      value={form.cover_image}
                      onChange={e => { set('cover_image', e.target.value); setUploadPreview(''); }}
                      placeholder="https://images.unsplash.com/..."
                      className={inputCls}
                    />
                    {form.cover_image && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-white/8">
                        <img
                          src={form.cover_image}
                          alt="preview"
                          className="w-full h-28 object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className={`w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-all ${
                        uploadPreview
                          ? 'border-[#a3e635]/40 bg-[#a3e635]/5'
                          : 'border-white/10 hover:border-[#a3e635]/30 hover:bg-[#a3e635]/5'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      {uploading ? (
                        <>
                          <Loader2 size={24} className="text-[#a3e635] animate-spin" />
                          <span className="text-gray-400 text-xs">Uploading…</span>
                        </>
                      ) : uploadPreview ? (
                        <>
                          <img src={uploadPreview} alt="preview" className="w-full max-h-32 object-cover rounded-lg" />
                          <span className="text-[#a3e635] text-xs flex items-center gap-1 mt-1">
                            <CheckCircle size={12} /> Uploaded — click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <ImagePlus size={24} className="text-gray-600" />
                          <span className="text-gray-400 text-xs">Click to upload image</span>
                          <span className="text-gray-600 text-xs">PNG, JPG, WebP · Max 5MB</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Short Excerpt * <span className="text-gray-600 font-normal">(1-2 sentences)</span></label>
                <textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2} placeholder="Brief summary" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Full Article Content * <span className="text-gray-600 font-normal">(Markdown supported)</span></label>
                <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={8} placeholder="Write your full article here. Include screenshots, IOCs, commands, evidence..." className={`${inputCls} resize-y font-mono`} />
              </div>

              {errMsg && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  <AlertCircle size={16} />{errMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors text-sm">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'loading' || uploading}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#a3e635] text-[#05080f] font-bold hover:bg-[#bef264] transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {status === 'loading' ? <><Loader2 size={16} className="animate-spin" />Submitting…</> : <><Send size={16} />Submit Article</>}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── PostModal ─────────────────────────────────────────────────────────────────
const PostModal: React.FC<{ post: BlogPost; onClose: () => void; onLike: (id: string) => void; likedPosts: Set<string>; onShareDone: () => void }> = ({ post, onClose, onLike, likedPosts, onShareDone }) => {
  const isLiked = likedPosts.has(post.id);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (IS_CONFIGURED) sbRpc('increment_post_views', { post_id: post.id }).catch(() => {});
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [post.id, onClose]);

  const handleLike = () => { onLike(post.id); setLocalLikes(l => isLiked ? l - 1 : l + 1); };

  const handleShare = (platform?: string) => {
    const url = `${window.location.origin}/blog/${post.slug}`;
    const text = `${post.title} — CyberHx Security Blog`;
    if (!platform) {
      if (navigator.share) navigator.share({ title: post.title, text: post.excerpt, url }).catch(() => {});
      else { navigator.clipboard.writeText(url); onShareDone(); }
    } else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    else if (platform === 'linkedin') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    else if (platform === 'copy') { navigator.clipboard.writeText(url); onShareDone(); }
    setShowShareMenu(false);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="bg-[#07090f] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[93vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="relative h-48 sm:h-64 flex-shrink-0">
            <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=60'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090f] via-black/30 to-transparent" />
            <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/70 transition-colors"><X size={18} /></button>
            <div className="absolute bottom-4 left-5"><CategoryBadge category={post.category} /></div>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="p-5 sm:p-7">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight mb-3">{post.title}</h1>
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/8">
                <img src={post.author_avatar} alt={post.author_name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{post.author_name}</p>
                  <p className="text-gray-500 text-xs">{post.author_role}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{new Date(post.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className="flex items-center gap-1 justify-end mt-0.5"><Clock size={10} />{post.read_time} min read</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {post.tags.map(tag => <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/8">#{tag}</span>)}
              </div>
              <div className="text-gray-300 leading-relaxed text-sm sm:text-base">
                <p>{post.excerpt}</p>
                {post.content && post.content !== post.excerpt && <div className="mt-4 text-gray-400 text-sm leading-relaxed whitespace-pre-line">{post.content}</div>}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-[#07090f] border-t border-white/8 px-5 py-4 flex items-center gap-4">
            <button onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${isLiked ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25' : 'bg-white/5 text-gray-400 border border-white/8 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'}`}>
              <Heart size={16} className={isLiked ? 'fill-current' : ''} /><span>{localLikes}</span>
            </button>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm"><Eye size={15} /><span>{post.views.toLocaleString()}</span></div>
            <div className="relative ml-auto">
              <button onClick={() => setShowShareMenu(s => !s)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20 hover:bg-[#a3e635]/20 transition-colors text-sm font-medium">
                <Share2 size={15} /> Share
              </button>
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full right-0 mb-2 bg-[#0a0f1a] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[160px] z-10">
                    {[
                      { label: 'Twitter / X', action: 'twitter' },
                      { label: 'LinkedIn', action: 'linkedin' },
                      { label: 'Copy Link', action: 'copy' },
                    ].map(s => (
                      <button key={s.action} onClick={() => handleShare(s.action)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        {s.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Main BlogPage ─────────────────────────────────────────────────────────────
const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featured, setFeatured] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cyberhx_liked') ?? '[]')); }
    catch { return new Set(); }
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  useEffect(() => {
    const h = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    sbFetch('blog_categories', { select: 'id,name,slug', order: 'name.asc' }).then(({ data }) => {
      if (Array.isArray(data) && data.length > 0) setCategories([{ id: '0', name: 'All Posts', slug: 'all' }, ...data]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    try { localStorage.setItem('cyberhx_liked', JSON.stringify([...likedPosts])); }
    catch {}
  }, [likedPosts]);

  const loadPosts = useCallback(async (pg = 1, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      if (!IS_CONFIGURED) throw new Error('demo');
      const params: Record<string, string> = {
        select: 'id,title,slug,excerpt,cover_image,category,tags,author_name,author_avatar,author_role,published_at,read_time,views,likes,comments_count,featured,shares',
        status: 'eq.published', order: 'published_at.desc',
        offset: String((pg - 1) * PAGE_SIZE), limit: String(PAGE_SIZE),
      };
      if (selectedCategory !== 'all') params.category = `eq.${selectedCategory}`;
      if (selectedTag) params.tags = `cs.{${selectedTag}}`;
      if (debouncedSearch) params.or = `title.ilike.*${debouncedSearch}*,excerpt.ilike.*${debouncedSearch}*,author_name.ilike.*${debouncedSearch}*`;
      const { data, count } = await sbFetch('blog_posts', params);
      if (!Array.isArray(data)) throw new Error('Invalid');
      setTotalCount(count);
      if (append) setPosts(p => [...p, ...(data as BlogPost[])]);
      else setPosts(data as BlogPost[]);
      if (pg === 1 && selectedCategory === 'all' && !debouncedSearch && !selectedTag) {
        const { data: fd } = await sbFetch('blog_posts', { select: params.select, status: 'eq.published', featured: 'eq.true', order: 'published_at.desc', limit: '3' });
        setFeatured(Array.isArray(fd) ? fd as BlogPost[] : []);
      }
    } catch {
      let filtered = DEMO_POSTS;
      if (selectedCategory !== 'all') filtered = filtered.filter(p => p.category === selectedCategory);
      if (selectedTag) filtered = filtered.filter(p => p.tags.includes(selectedTag));
      if (debouncedSearch) { const q = debouncedSearch.toLowerCase(); filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.author_name.toLowerCase().includes(q)); }
      setTotalCount(filtered.length);
      if (append) setPosts(p => [...p, ...filtered.slice((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE)]);
      else setPosts(filtered.slice(0, PAGE_SIZE));
      if (pg === 1) setFeatured(DEMO_POSTS.filter(p => p.featured).slice(0, 3));
    } finally { setLoading(false); setLoadingMore(false); }
  }, [selectedCategory, selectedTag, debouncedSearch]);

  useEffect(() => { setPage(1); loadPosts(1, false); }, [selectedCategory, selectedTag, debouncedSearch]);
  const loadMore = () => { const next = page + 1; setPage(next); loadPosts(next, true); };
  const hasMore = posts.length < totalCount;
  const hasFilters = selectedCategory !== 'all' || searchQuery || selectedTag;
  const clearFilters = () => { setSelectedCategory('all'); setSearchQuery(''); setSelectedTag(''); setPage(1); };

  const handleLike = async (postId: string) => {
    const sid = getSessionId();
    const wasLiked = likedPosts.has(postId);
    setLikedPosts(s => { const n = new Set(s); wasLiked ? n.delete(postId) : n.add(postId); return n; });
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, likes: wasLiked ? p.likes - 1 : p.likes + 1 } : p));
    if (IS_CONFIGURED) await sbRpc('toggle_post_like', { p_post_id: postId, p_session_id: sid }).catch(() => {});
  };

  const handleShareDone = () => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); };

  return (
    <div className="min-h-screen bg-[#05080f] pt-14 sm:pt-16">
      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/3 via-transparent to-cyan-500/3" />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(163,230,53,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(163,230,53,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-5">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-red-400 text-sm font-medium">Live Threat Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              CyberHx <span className="text-[#a3e635]">Security</span> Blog
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
              Real-time threat intelligence, scam alerts & cybersecurity research from India's leading security community.
            </p>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm">
              {[
                { icon: <Newspaper size={15} />, label: `${IS_CONFIGURED ? totalCount : '6'}+ Articles`, color: 'text-[#a3e635]' },
                { icon: <User size={15} />, label: '20+ Researchers', color: 'text-cyan-400' },
                { icon: <Eye size={15} />, label: '50k+ Readers', color: 'text-orange-400' },
                { icon: <Shield size={15} />, label: 'Verified Research', color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-gray-400">
                  <span className={s.color}>{s.icon}</span>{s.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!IS_CONFIGURED && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-sm">
            <WifiOff size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold mb-1">Demo mode — Supabase not configured</p>
              <p className="text-yellow-400/70">Add <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your <code className="bg-black/30 px-1 rounded">.env</code> file.</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {shareCopied && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#a3e635] text-[#05080f] px-4 py-2 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 shadow-lg">
              <CheckCircle size={15} />Link copied!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="search" placeholder="Search articles, tags, authors…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0f1a] border border-white/8 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#a3e635]/50 focus:ring-1 focus:ring-[#a3e635]/20 transition-all text-sm" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"><X size={16} /></button>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[#0a0f1a] border border-white/8 text-gray-400 hover:text-[#a3e635] hover:border-[#a3e635]/30 transition-all text-sm min-w-[44px] justify-center">
                {viewMode === 'list' ? <LayoutGrid size={18} /> : <LayoutList size={18} />}
                <span className="hidden sm:inline">{viewMode === 'list' ? 'Grid' : 'List'}</span>
              </button>
              <button onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#a3e635] text-[#05080f] font-semibold hover:bg-[#bef264] transition-colors text-sm">
                <Plus size={16} /><span className="hidden sm:inline">Submit Article</span><span className="sm:hidden">Submit</span>
              </button>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map(cat => {
              const active = (cat.name === 'All Posts' ? 'all' : cat.name) === selectedCategory;
              const cc = cat.name !== 'All Posts' ? getCat(cat.name) : null;
              return (
                <button key={cat.id} onClick={() => { setSelectedCategory(cat.name === 'All Posts' ? 'all' : cat.name); setPage(1); setSelectedTag(''); }}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${active
                    ? cc ? `${cc.bg} ${cc.text} ${cc.border}` : 'bg-[#a3e635] text-[#05080f] border-[#a3e635]'
                    : 'bg-[#0a0f1a] border-white/8 text-gray-400 hover:text-white hover:border-white/20'}`}>
                  {cat.name}
                </button>
              );
            })}
          </div>

          {selectedTag && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Tag:</span>
              <button onClick={() => setSelectedTag('')} className="flex items-center gap-1.5 bg-[#a3e635]/15 text-[#a3e635] border border-[#a3e635]/30 px-3 py-1 rounded-full text-sm hover:bg-[#a3e635]/25 transition-colors">
                #{selectedTag} <X size={13} />
              </button>
            </div>
          )}

          {(debouncedSearch || hasFilters) && !loading && (
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">
                {totalCount > 0 ? <><span className="text-[#a3e635] font-medium">{totalCount}</span> articles found</> : 'No articles found'}
                {debouncedSearch && <> for "<span className="text-white">{debouncedSearch}</span>"</>}
              </p>
              {hasFilters && <button onClick={clearFilters} className="text-gray-500 hover:text-[#a3e635] text-sm flex items-center gap-1 transition-colors"><X size={14} />Clear filters</button>}
            </div>
          )}
        </div>

        {/* Main layout */}
        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {/* Featured */}
            {!hasFilters && !loading && featured.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-5"><TrendingUp size={20} className="text-[#a3e635]" /><h2 className="text-xl font-bold text-white">Featured</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map(p => <FeaturedCard key={p.id} post={p} onClick={() => setSelectedPost(p)} />)}
                </div>
              </section>
            )}

            {/* Posts */}
            <section>
              {!loading && posts.length > 0 && (
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">{hasFilters ? 'Search Results' : 'Latest Articles'}</h2>
                  <span className="text-gray-500 text-sm">{totalCount} total</span>
                </div>
              )}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4"><Loader2 size={32} className="text-[#a3e635] animate-spin" /><p className="text-gray-500 text-sm">Loading articles…</p></div>
              ) : posts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                  <Search size={48} className="text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">No articles found</h3>
                  <p className="text-gray-600 text-sm mb-5">Try different keywords or clear filters</p>
                  <button onClick={clearFilters} className="text-[#a3e635] hover:underline text-sm">Clear all filters</button>
                </motion.div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
                  {posts.map(p => <PostCard key={p.id} post={p} onClick={() => setSelectedPost(p)} viewMode={viewMode} liked={likedPosts.has(p.id)} />)}
                </div>
              )}
              {!loading && hasMore && (
                <div className="mt-10 text-center">
                  <button onClick={loadMore} disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#0a0f1a] border border-white/10 rounded-xl text-gray-300 hover:text-[#a3e635] hover:border-[#a3e635]/30 transition-all text-sm font-medium disabled:opacity-50">
                    {loadingMore ? <><Loader2 size={16} className="animate-spin" />Loading…</> : <>Load More <ChevronRight size={16} /></>}
                  </button>
                  <p className="text-gray-600 text-xs mt-2">Showing {posts.length} of {totalCount}</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="xl:w-72 flex-shrink-0 space-y-6">
            <div className="glass-effect rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><Filter size={16} className="text-[#a3e635]" />Categories</h3>
              <div className="space-y-1.5">
                {Object.entries(CAT_COLORS).map(([name, c]) => (
                  <button key={name} onClick={() => { setSelectedCategory(name); setPage(1); setSelectedTag(''); }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg transition-all text-left text-sm ${selectedCategory === name ? `${c.bg} ${c.text}` : 'text-gray-500 hover:text-gray-300 hover:bg-white/4'}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />{name}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><Flame size={16} className="text-orange-400" />Trending Tags</h3>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map(tag => (
                  <button key={tag} onClick={() => { setSelectedTag(tag === selectedTag ? '' : tag); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${tag === selectedTag ? 'bg-[#a3e635] text-[#05080f] border-[#a3e635]' : 'bg-[#a3e635]/8 text-[#a3e635]/70 border-[#a3e635]/15 hover:bg-[#a3e635]/15 hover:text-[#a3e635]'}`}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-2xl p-5 bg-gradient-to-br from-[#a3e635]/5 to-transparent border border-[#a3e635]/15">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2"><Upload size={16} className="text-[#a3e635]" />Share Your Research</h3>
              <p className="text-gray-500 text-xs mb-4 leading-relaxed">Found a scam? Analyzed malware? Written a CTF solution? Share it with the community.</p>
              <button onClick={() => setShowSubmitModal(true)} className="w-full py-2.5 rounded-xl bg-[#a3e635] text-[#05080f] font-bold text-sm hover:bg-[#bef264] transition-colors">Submit Article</button>
            </div>

            <div className="glass-effect rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2"><Shield size={16} className="text-cyan-400" />Community Rules</h3>
              <ul className="space-y-2.5 text-gray-400 text-sm">
                {['Share verified findings with evidence', 'Include screenshots & technical details', 'Protect victim privacy always', 'Follow responsible disclosure', 'Help educate the community'].map(r => (
                  <li key={r} className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5" /><span>{r}</span></li>
                ))}
              </ul>
            </div>

            <div className="glass-effect rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-4">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { label: 'Report a Scam', href: '/contact', color: 'text-red-400' },
                  { label: 'CTF Platform', href: '#', color: 'text-lime-400' },
                  { label: 'Pentest Lab', href: '#', color: 'text-purple-400' },
                  { label: 'Community Forum', href: '/contact', color: 'text-sky-400' },
                ].map(l => (
                  <a key={l.label} href={l.href} className="flex items-center justify-between p-3 rounded-xl bg-[#0a0f1a] text-gray-400 hover:text-white hover:bg-white/4 transition-all text-sm group">
                    <span className={`${l.color} font-medium`}>{l.label}</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                ))}
              </div>
            </div>

            <div className="glass-effect rounded-2xl p-5">
              <h3 className="text-base font-bold text-white mb-2">Stay Updated</h3>
              <p className="text-gray-500 text-xs mb-4">Get security alerts in your inbox.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="your@email.com"
                  className="flex-1 min-w-0 bg-[#0a0f1a] border border-white/8 rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#a3e635]/40 placeholder-gray-600" />
                <button className="bg-[#a3e635] text-[#05080f] p-2.5 rounded-lg hover:bg-[#bef264] transition-colors flex-shrink-0"><Send size={15} /></button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {selectedPost && <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} onLike={handleLike} likedPosts={likedPosts} onShareDone={handleShareDone} />}
      {showSubmitModal && <SubmitArticleModal onClose={() => setShowSubmitModal(false)} />}

      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-4 sm:right-6 bg-[#a3e635] text-[#05080f] p-3 rounded-full shadow-lg hover:bg-[#bef264] transition-colors z-40">
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlogPage;
