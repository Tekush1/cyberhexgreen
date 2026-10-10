import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bold,
  Code2,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Mascot } from '../../components/shared/Mascot';
import { Markdown } from './Markdown';
import {
  checkAdmin,
  deletePost,
  explain,
  getPostForEdit,
  isConfigured,
  listCategories,
  savePost,
  submitForReview,
  uploadFile,
  type Category,
  type Draft,
  type PostStatus,
} from './api';
import { excerptFrom, readTime, slugify, wordCount } from './utils';

const FALLBACK_CATEGORIES = [
  'Scam Alert',
  'Malware Analysis',
  'Fraud Investigation',
  'Social Engineering',
  'Web Security',
  'Mobile Security',
  'CTF Writeups',
  'Tutorials',
  'News & Updates',
];

const emptyDraft = (): Draft => ({
  title: '',
  excerpt: '',
  content: '',
  cover_image: '',
  category: '',
  tags: [],
  author_name: '',
  author_role: '',
  author_avatar: '',
  slug: '',
  featured: false,
});

type Saved = { draft: Draft; email: string; at: number };
const storeKey = (id?: string) => `cyberhx-blog-draft:${id ? `edit:${id}` : 'new'}`;
const readLocal = (k: string): Saved | null => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    return s && s.draft ? { ...s, draft: { ...emptyDraft(), ...s.draft } } : null;
  } catch {
    return null;
  }
};
const writeLocal = (k: string, v: Saved | null) => {
  try {
    if (v) localStorage.setItem(k, JSON.stringify(v));
    else localStorage.removeItem(k);
  } catch {
    /* storage full or blocked; the editor still works */
  }
};

const inputCls =
  'w-full rounded-xl border-2 border-line bg-ink px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-glow';
const labelCls = 'mb-1.5 block text-xs font-semibold text-muted';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const key = storeKey(id);

  const [draft, setDraft] = useState<Draft>(() => readLocal(key)?.draft ?? emptyDraft());
  const [email, setEmail] = useState(() => readLocal(key)?.email ?? '');
  const [restored, setRestored] = useState(() => !id && !!readLocal(key));
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loadingPost, setLoadingPost] = useState(!!id);
  const [postStatus, setPostStatus] = useState<PostStatus>('draft');
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [uploads, setUploads] = useState(0);
  const [busy, setBusy] = useState<'' | 'publish' | 'draft' | 'submit' | 'delete'>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [coverDrag, setCoverDrag] = useState(false);
  const [bodyDrag, setBodyDrag] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const bodyInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  /* ---------- boot ---------- */
  useEffect(() => {
    document.title = id ? 'Edit post · CyberHx Blog' : 'Write · CyberHx Blog';
    checkAdmin().then(setAdmin);
    listCategories()
      .then((c: Category[]) => c.length && setCategories(c.map((x) => x.name)))
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (admin === false) {
      setLoadingPost(false);
      return;
    }
    if (admin !== true) return;
    getPostForEdit(id)
      .then((p) => {
        if (!p) {
          setErrors(['This post was not found.']);
          return;
        }
        setPostStatus(p.status);
        const fromServer: Draft = {
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          cover_image: p.cover_image,
          category: p.category,
          tags: p.tags ?? [],
          author_name: p.author_name,
          author_role: p.author_role,
          author_avatar: p.author_avatar ?? '',
          slug: p.slug,
          featured: p.featured,
        };
        const local = readLocal(key);
        const serverTime = p.updated_at ? Date.parse(p.updated_at) : 0;
        if (local && local.at > serverTime) {
          setDraft(local.draft);
          setRestored(true);
        } else setDraft(fromServer);
        setSlugTouched(true);
      })
      .catch((e) => setErrors([explain(e)]))
      .finally(() => setLoadingPost(false));
  }, [id, admin, key]);

  /* ---------- autosave (on this device) ---------- */
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    if (loadingPost || submitted) return;
    const t = setTimeout(() => {
      const hasContent = draft.title || draft.content || draft.cover_image;
      writeLocal(key, hasContent ? { draft, email, at: Date.now() } : null);
      if (hasContent) setSavedAt(Date.now());
    }, 600);
    return () => clearTimeout(t);
  }, [draft, email, key, loadingPost, submitted]);

  /* ---------- auto link from title ---------- */
  useEffect(() => {
    if (!slugTouched) setDraft((d) => ({ ...d, slug: slugify(d.title) }));
  }, [draft.title, slugTouched]);

  /* ---------- grow the body box with its content ---------- */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(420, el.scrollHeight)}px`;
  }, [draft.content, view]);

  /* ---------- warn before leaving mid-upload ---------- */
  useEffect(() => {
    if (!uploads) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [uploads]);

  /* ---------- text editing helpers ---------- */
  const replaceSelection = useCallback((fn: (sel: string) => { text: string; selectFrom?: number; selectTo?: number }) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const out = fn(value.slice(s, e));
    const next = value.slice(0, s) + out.text + value.slice(e);
    setDraft((d) => ({ ...d, content: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + (out.selectFrom ?? out.text.length), s + (out.selectTo ?? out.text.length));
    });
  }, []);

  const wrap = (before: string, after = before, placeholder = 'text') =>
    replaceSelection((sel) => {
      const inner = sel || placeholder;
      return { text: before + inner + after, selectFrom: before.length, selectTo: before.length + inner.length };
    });

  const prefixLines = (prefix: (i: number) => string, placeholder: string) => {
    const el = bodyRef.current;
    if (!el) return;
    // Extend the selection to whole lines.
    const v = el.value;
    const start = v.lastIndexOf('\n', el.selectionStart - 1) + 1;
    let end = v.indexOf('\n', el.selectionEnd);
    if (end === -1) end = v.length;
    el.setSelectionRange(start, end);
    replaceSelection((sel) => {
      const lines = (sel || placeholder).split('\n');
      const text = lines.map((l, i) => prefix(i) + l.replace(/^(#{1,6}\s|>\s|-\s|\d+\.\s)/, '')).join('\n');
      return { text };
    });
  };

  const block = (text: string, cursorOffset?: number) =>
    replaceSelection(() => {
      const el = bodyRef.current!;
      const before = el.value.slice(0, el.selectionStart);
      const lead = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
      return { text: `${lead}${text}\n\n`, selectFrom: lead.length + (cursorOffset ?? text.length), selectTo: lead.length + (cursorOffset ?? text.length) };
    });

  const tools = [
    { icon: Heading2, label: 'Heading', run: () => prefixLines(() => '## ', 'Heading') },
    { icon: Heading3, label: 'Subheading', run: () => prefixLines(() => '### ', 'Subheading') },
    { icon: Bold, label: 'Bold (Ctrl+B)', run: () => wrap('**') },
    { icon: Italic, label: 'Italic (Ctrl+I)', run: () => wrap('_') },
    { icon: Link2, label: 'Link (Ctrl+K)', run: () => replaceSelection((sel) => {
        const t = sel || 'link text';
        return { text: `[${t}](https://)`, selectFrom: t.length + 3, selectTo: t.length + 11 };
      }) },
    { icon: Quote, label: 'Quote', run: () => prefixLines(() => '> ', 'Quote') },
    { icon: List, label: 'Bullet list', run: () => prefixLines(() => '- ', 'List item') },
    { icon: ListOrdered, label: 'Numbered list', run: () => prefixLines((i) => `${i + 1}. `, 'List item') },
    { icon: Code2, label: 'Code block', run: () => block('```\ncode\n```', 4) },
    { icon: Minus, label: 'Divider', run: () => block('---') },
  ];

  const onBodyKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); wrap('**'); }
    if (k === 'i') { e.preventDefault(); wrap('_'); }
    if (k === 'k') { e.preventDefault(); tools[4].run(); }
  };

  /* ---------- uploads ---------- */
  const isAdmin = admin === true;

  const insertFiles = async (files: File[]) => {
    const el = bodyRef.current;
    for (const file of files) {
      const token = `![Uploading ${file.name.replace(/[[\]]/g, '')}…](${Math.random().toString(36).slice(2, 8)})`;
      // Put a placeholder at the cursor right away so the writer sees where it goes.
      const pos = el ? el.selectionEnd : draft.content.length;
      setDraft((d) => {
        const before = d.content.slice(0, pos);
        const pad = before && !before.endsWith('\n') ? '\n\n' : '';
        return { ...d, content: `${before}${pad}${token}\n\n${d.content.slice(pos)}` };
      });
      setUploads((n) => n + 1);
      try {
        const up = await uploadFile(file, isAdmin);
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/[[\]]/g, '');
        const md = up.isImage ? `![${alt}](${up.url})` : `[${up.name}](${up.url})`;
        setDraft((d) => ({ ...d, content: d.content.replace(token, md) }));
      } catch (err) {
        setDraft((d) => ({ ...d, content: d.content.replace(`${token}\n\n`, '').replace(token, '') }));
        setErrors([`${file.name}: ${explain(err)}`]);
      } finally {
        setUploads((n) => n - 1);
      }
    }
  };

  const setCoverFrom = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(['The cover must be an image (JPG, PNG, WebP or GIF).']);
      return;
    }
    setUploads((n) => n + 1);
    try {
      const up = await uploadFile(file, isAdmin);
      set('cover_image', up.url);
    } catch (err) {
      setErrors([`Cover: ${explain(err)}`]);
    } finally {
      setUploads((n) => n - 1);
    }
  };

  const setAvatarFrom = async (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploads((n) => n + 1);
    try {
      set('author_avatar', (await uploadFile(file, isAdmin)).url);
    } catch (err) {
      setErrors([`Photo: ${explain(err)}`]);
    } finally {
      setUploads((n) => n - 1);
    }
  };

  const filesFrom = (list: FileList | null | undefined) => Array.from(list ?? []);

  const onBodyPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = filesFrom(e.clipboardData.files);
    if (files.length) {
      e.preventDefault();
      insertFiles(files);
    }
  };
  const onBodyDrop = (e: DragEvent<HTMLTextAreaElement>) => {
    setBodyDrag(false);
    const files = filesFrom(e.dataTransfer.files);
    if (files.length) {
      e.preventDefault();
      insertFiles(files);
    }
  };

  /* ---------- tags ---------- */
  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '').slice(0, 30);
    if (!t) return;
    setDraft((d) => (d.tags.some((x) => x.toLowerCase() === t.toLowerCase()) || d.tags.length >= 8 ? d : { ...d, tags: [...d.tags, t] }));
    setTagInput('');
  };

  /* ---------- stats ---------- */
  const words = useMemo(() => wordCount(draft.content), [draft.content]);
  const minutes = useMemo(() => readTime(draft.content), [draft.content]);
  const autoExcerpt = useMemo(() => excerptFrom(draft.content), [draft.content]);

  /* ---------- validation + actions ---------- */
  const problems = (forReview: boolean) => {
    const p: string[] = [];
    if (draft.title.trim().length < 5) p.push('Add a title (at least 5 characters).');
    if (words < 30) p.push('Write a bit more: at least 30 words.');
    if (!draft.category) p.push('Pick a category.');
    if (uploads) p.push('Wait for uploads to finish.');
    if (forReview) {
      if (draft.author_name.trim().length < 2) p.push('Add your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) p.push('Add a valid email so we can reach you.');
    }
    return p;
  };

  const finalDraft = (): Draft => ({ ...draft, excerpt: draft.excerpt.trim() || autoExcerpt });

  const publish = async (status: PostStatus) => {
    const p = status === 'published' ? problems(false) : draft.title.trim() ? [] : ['Add a title first.'];
    setErrors(p);
    if (p.length) return;
    setBusy(status === 'published' ? 'publish' : 'draft');
    try {
      const saved = await savePost(finalDraft(), status, id);
      writeLocal(key, null);
      if (status === 'published') navigate(`/blog/${saved.slug}`);
      else {
        setPostStatus('draft');
        setNotice('Draft saved.');
        if (!id) navigate(`/blog/edit/${saved.id}`, { replace: true });
      }
    } catch (e) {
      setErrors([explain(e)]);
    } finally {
      setBusy('');
    }
  };

  const submit = async () => {
    const p = problems(true);
    setErrors(p);
    if (p.length) return;
    setBusy('submit');
    try {
      await submitForReview(finalDraft(), email);
      writeLocal(key, null);
      setSubmitted(true);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErrors([explain(e)]);
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!id || !window.confirm('Delete this post for good? This cannot be undone.')) return;
    setBusy('delete');
    try {
      await deletePost(id);
      writeLocal(key, null);
      navigate('/blog');
    } catch (e) {
      setErrors([explain(e)]);
      setBusy('');
    }
  };

  const startOver = () => {
    writeLocal(key, null);
    setDraft(emptyDraft());
    setEmail('');
    setRestored(false);
    setSlugTouched(false);
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  /* ---------- screens ---------- */

  if (submitted) {
    return (
      <div className="min-h-screen bg-ink px-5 pb-24 pt-32 text-center">
        <Mascot pose="trophy" alt="" eager className="mascot-pop mx-auto w-48" />
        <h1 className="font-display mt-6 text-4xl text-white">Sent for review.</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-muted">
          Thanks for writing for CyberHx. An editor reads every post before it goes live. We'll email you at{' '}
          <span className="text-white">{email}</span> once it's published.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/blog" className="btn btn-lime">Back to the blog</Link>
          <button type="button" className="btn btn-ghost" onClick={() => { setSubmitted(false); startOver(); }}>
            Write another
          </button>
        </div>
      </div>
    );
  }

  if (id && admin === false) {
    return (
      <div className="min-h-screen bg-ink px-5 pb-24 pt-32 text-center">
        <Mascot pose="confused" alt="" eager className="mx-auto w-40" />
        <h1 className="font-display mt-6 text-3xl text-white">Admins only</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">Log in at the admin panel to edit posts, then come back here.</p>
        <Link to="/admin" className="btn btn-lime mt-7">Go to admin login</Link>
      </div>
    );
  }

  const primary = isAdmin
    ? { label: id && postStatus === 'published' ? 'Update post' : 'Publish', run: () => publish('published'), busy: busy === 'publish' }
    : { label: 'Send for review', run: submit, busy: busy === 'submit' };

  return (
    <div className="min-h-screen bg-ink pb-28 pt-16 text-white sm:pt-[72px]">
      {/* Top bar */}
      <div className="sticky top-16 z-40 border-b-2 border-line bg-ink/95 backdrop-blur sm:top-[72px]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link to="/blog" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted transition hover:text-white">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Blog</span>
          </Link>
          <p className="flex-1 truncate text-xs text-muted" aria-live="polite">
            {uploads
              ? `Uploading ${uploads} file${uploads > 1 ? 's' : ''}…`
              : notice || (savedAt ? 'Saved on this device' : isAdmin ? 'Writing as admin' : 'Your draft saves on this device as you type')}
          </p>
          <div className="flex rounded-lg border-2 border-line p-0.5" role="tablist" aria-label="Editor view">
            {(
              [
                ['write', PenLine, 'Write'],
                ['preview', Eye, 'Preview'],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${view === v ? 'bg-white text-ink' : 'text-muted hover:text-white'}`}
              >
                <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => publish('draft')}
              disabled={!!busy}
              className="hidden rounded-lg border-2 border-line px-3 py-1.5 text-sm font-semibold text-white/85 transition hover:border-white/30 disabled:opacity-50 sm:block"
            >
              {busy === 'draft' ? 'Saving…' : id && postStatus === 'published' ? 'Move to drafts' : 'Save draft'}
            </button>
          )}
          <button type="button" onClick={primary.run} disabled={!!busy || admin === null} className="btn btn-lime hidden !min-h-[38px] !px-4 !text-sm sm:inline-flex">
            {primary.busy ? 'Working…' : primary.label}
          </button>
        </div>
      </div>

      {!isConfigured() && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="rounded-xl border-2 border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">
            The blog is not connected to Supabase yet, so uploads and publishing won't work. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.
          </p>
        </div>
      )}

      {restored && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-glow/40 bg-glow/[0.06] px-4 py-3 text-sm">
            <span>We restored the draft you were writing on this device.</span>
            <div className="flex gap-3">
              <button type="button" className="font-semibold text-glow" onClick={() => setRestored(false)}>Keep it</button>
              <button type="button" className="font-semibold text-white/70 hover:text-white" onClick={startOver}>Start over</button>
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8" role="alert">
          <div className="flex items-start gap-3 rounded-xl border-2 border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            <ul className="flex-1 list-disc space-y-1 pl-4">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
            <button type="button" onClick={() => setErrors([])} aria-label="Dismiss" className="text-red-200/70 hover:text-white"><X size={16} /></button>
          </div>
        </div>
      )}

      {loadingPost ? (
        <p className="mt-24 text-center text-muted">Loading the post…</p>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          {/* ───────── Main column ───────── */}
          <div className="min-w-0">
            {view === 'preview' ? (
              <article className="mx-auto max-w-3xl">
                {draft.cover_image && <img src={draft.cover_image} alt="" className="mb-8 aspect-[2/1] w-full rounded-2xl border-2 border-line object-cover" />}
                {draft.category && <p className="text-sm font-semibold text-glow">{draft.category}</p>}
                <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">{draft.title || 'Untitled post'}</h1>
                <p className="mt-4 text-lg leading-8 text-muted">{draft.excerpt || autoExcerpt}</p>
                <p className="mt-4 text-sm text-muted">{draft.author_name || (isAdmin ? 'CyberHx Team' : 'Your name')} · {minutes} min read</p>
                <div className="mt-8 border-t-2 border-line pt-2">
                  {draft.content.trim() ? <Markdown>{draft.content}</Markdown> : <p className="mt-6 text-muted">Nothing to preview yet.</p>}
                </div>
              </article>
            ) : (
              <>
                {/* Cover */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setCoverDrag(true); }}
                  onDragLeave={() => setCoverDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setCoverDrag(false); setCoverFrom(e.dataTransfer.files?.[0]); }}
                  className={`group relative overflow-hidden rounded-2xl border-2 border-dashed transition ${coverDrag ? 'border-glow bg-glow/[0.06]' : 'border-line'}`}
                >
                  {draft.cover_image ? (
                    <>
                      <img src={draft.cover_image} alt="Cover" className="aspect-[2/1] w-full object-cover" />
                      <div className="absolute right-3 top-3 flex gap-2">
                        <button type="button" onClick={() => coverInput.current?.click()} className="rounded-lg bg-ink/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-ink">Change</button>
                        <button type="button" onClick={() => set('cover_image', '')} className="rounded-lg bg-ink/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-ink">Remove</button>
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => coverInput.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                      <ImagePlus size={28} className="text-glow" />
                      <span className="font-semibold">Add a cover image</span>
                      <span className="text-xs text-muted">Drop it here or click to choose. Wide images look best.</span>
                    </button>
                  )}
                  <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { setCoverFrom(e.target.files?.[0]); e.target.value = ''; }} />
                </div>

                {/* Title */}
                <textarea
                  value={draft.title}
                  onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
                  placeholder="Post title"
                  rows={1}
                  maxLength={160}
                  aria-label="Title"
                  className="font-display mt-8 w-full resize-none bg-transparent text-4xl leading-tight text-white outline-none placeholder:text-white/20 sm:text-5xl"
                  onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                />

                {/* Toolbar */}
                <div className="sticky top-[118px] z-30 mt-6 flex flex-wrap items-center gap-0.5 rounded-xl border-2 border-line bg-panel/95 p-1 backdrop-blur sm:top-[126px]">
                  {tools.map(({ icon: Icon, label, run }) => (
                    <button key={label} type="button" onClick={run} title={label} aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/[0.08] hover:text-white">
                      <Icon size={17} />
                    </button>
                  ))}
                  <span className="mx-1 h-6 w-px bg-line" />
                  <button type="button" onClick={() => bodyInput.current?.click()} className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-glow transition hover:bg-glow/10">
                    <Upload size={16} /> Image or PDF
                  </button>
                  <input ref={bodyInput} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { insertFiles(filesFrom(e.target.files)); e.target.value = ''; }} />
                </div>

                {/* Body */}
                <textarea
                  ref={bodyRef}
                  value={draft.content}
                  onChange={(e) => set('content', e.target.value)}
                  onKeyDown={onBodyKey}
                  onPaste={onBodyPaste}
                  onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setBodyDrag(true); } }}
                  onDragLeave={() => setBodyDrag(false)}
                  onDrop={onBodyDrop}
                  placeholder={'Start writing…\n\nUse the toolbar or markdown (## for a heading, **bold**, - for a list).\nPaste or drop images anywhere and they upload on their own.'}
                  aria-label="Post body"
                  className={`mt-4 w-full resize-none rounded-xl border-2 bg-transparent p-4 font-mono text-[15px] leading-7 text-white/90 outline-none transition placeholder:text-white/25 ${bodyDrag ? 'border-glow bg-glow/[0.04]' : 'border-transparent focus:border-line'}`}
                />
                <p className="mt-2 text-xs text-muted">{words} words · {minutes} min read</p>
              </>
            )}
          </div>

          {/* ───────── Settings ───────── */}
          <aside className="space-y-6 lg:sticky lg:top-[140px] lg:self-start">
            {!isAdmin && admin !== null && (
              <div className="rounded-2xl border-2 border-line bg-panel p-5">
                <h2 className="font-semibold">About you</h2>
                <p className="mt-1 text-xs leading-5 text-muted">An editor reviews every post. Your email stays private.</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={labelCls} htmlFor="ed-name">Name</label>
                    <input id="ed-name" className={inputCls} value={draft.author_name} onChange={(e) => set('author_name', e.target.value)} maxLength={60} autoComplete="name" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ed-email">Email</label>
                    <input id="ed-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="ed-role">Role (optional)</label>
                    <input id="ed-role" className={inputCls} value={draft.author_role} onChange={(e) => set('author_role', e.target.value)} placeholder="Student, CTF player, analyst…" maxLength={60} />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border-2 border-line bg-panel p-5">
              <h2 className="font-semibold">Post settings</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelCls} htmlFor="ed-cat">Category</label>
                  <select id="ed-cat" className={inputCls} value={draft.category} onChange={(e) => set('category', e.target.value)}>
                    <option value="">Choose one</option>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls} htmlFor="ed-tags">Tags <span className="font-normal">({draft.tags.length}/8)</span></label>
                  <div className="flex flex-wrap gap-1.5 rounded-xl border-2 border-line bg-ink p-2 focus-within:border-glow">
                    {draft.tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 rounded-md bg-glow/10 px-2 py-0.5 text-xs font-semibold text-glow">
                        {t}
                        <button type="button" aria-label={`Remove ${t}`} onClick={() => set('tags', draft.tags.filter((x) => x !== t))}><X size={12} /></button>
                      </span>
                    ))}
                    <input
                      id="ed-tags"
                      value={tagInput}
                      onChange={(e) => (e.target.value.endsWith(',') ? addTag(e.target.value.slice(0, -1)) : setTagInput(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); }
                        if (e.key === 'Backspace' && !tagInput && draft.tags.length) set('tags', draft.tags.slice(0, -1));
                      }}
                      onBlur={() => addTag(tagInput)}
                      placeholder={draft.tags.length ? '' : 'Type and press Enter'}
                      className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-white outline-none placeholder:text-white/25"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls} htmlFor="ed-excerpt">Short summary</label>
                  <textarea id="ed-excerpt" rows={3} maxLength={240} className={`${inputCls} resize-none leading-6`} value={draft.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder={autoExcerpt || 'Shown on the blog page. Leave empty to use your first paragraph.'} />
                </div>

                {isAdmin && (
                  <>
                    <div>
                      <label className={labelCls} htmlFor="ed-slug">Link</label>
                      <div className="flex items-center rounded-xl border-2 border-line bg-ink pl-3 text-sm focus-within:border-glow">
                        <span className="shrink-0 text-muted">/blog/</span>
                        <input id="ed-slug" className="w-full bg-transparent py-2.5 pr-3 text-white outline-none" value={draft.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} htmlFor="ed-an">Author</label>
                        <input id="ed-an" className={inputCls} value={draft.author_name} onChange={(e) => set('author_name', e.target.value)} placeholder="CyberHx Team" />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="ed-ar">Role</label>
                        <input id="ed-ar" className={inputCls} value={draft.author_role} onChange={(e) => set('author_role', e.target.value)} placeholder="CyberHx" />
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-line bg-ink px-3.5 py-2.5 text-sm">
                      <span>Feature on the blog page</span>
                      <input type="checkbox" className="h-4 w-4 accent-[#c6f135]" checked={draft.featured} onChange={(e) => set('featured', e.target.checked)} />
                    </label>
                  </>
                )}

                <div className="flex items-center gap-3">
                  {draft.author_avatar ? (
                    <img src={draft.author_avatar} alt="" className="h-11 w-11 rounded-full border-2 border-line object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-line text-muted"><ImagePlus size={16} /></span>
                  )}
                  <button type="button" onClick={() => avatarInput.current?.click()} className="text-sm font-semibold text-glow">
                    {draft.author_avatar ? 'Change author photo' : 'Add author photo'}
                  </button>
                  {draft.author_avatar && (
                    <button type="button" onClick={() => set('author_avatar', '')} className="text-xs text-muted hover:text-white">Remove</button>
                  )}
                  <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => { setAvatarFrom(e.target.files?.[0]); e.target.value = ''; }} />
                </div>
              </div>
            </div>

            {isAdmin && id && (
              <button type="button" onClick={remove} disabled={!!busy} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50">
                <Trash2 size={15} /> {busy === 'delete' ? 'Deleting…' : 'Delete post'}
              </button>
            )}

            <div className="hidden rounded-2xl border-2 border-line p-5 text-xs leading-6 text-muted lg:block">
              <p className="font-semibold text-white/80">Shortcuts</p>
              <p>Ctrl/⌘ + B bold, I italic, K link.</p>
              <p>Paste a screenshot straight into the text to add it.</p>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t-2 border-line bg-ink/95 p-3 backdrop-blur sm:hidden">
        {isAdmin && (
          <button type="button" onClick={() => publish('draft')} disabled={!!busy} className="flex-1 rounded-xl border-2 border-line px-3 text-sm font-semibold disabled:opacity-50">
            {busy === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
        )}
        <button type="button" onClick={primary.run} disabled={!!busy || admin === null} className="btn btn-lime flex-[2]">
          {primary.busy ? 'Working…' : primary.label}
        </button>
      </div>
    </div>
  );
}
