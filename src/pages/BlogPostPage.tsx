import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, Eye, Share2, Clock, User,
  Calendar, Tag, Shield, ChevronRight, X,
  CheckCircle, Loader2, AlertTriangle, ExternalLink
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
  updated_at?: string;
  read_time: number;
  views: number;
  likes: number;
  comments_count: number;
  featured: boolean;
  shares?: number;
}

// ─── Supabase config (same as BlogPage) ──────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const IS_CONFIGURED = !!(SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_PROJECT'));

async function sbFetchSingle(slug: string): Promise<BlogPost | null> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/blog_posts`);
  url.searchParams.set('slug', `eq.${slug}`);
  url.searchParams.set('status', 'eq.published');
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function sbRpc(fn: string, body: object) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// ─── Demo posts (same as BlogPage — fallback when Supabase not configured) ───
const DEMO_POSTS: BlogPost[] = [
  { id: '1', slug: 'whatsapp-otp-scam', title: 'New WhatsApp Scam: Fake OTP Verification Links', excerpt: 'Discovered a sophisticated phishing campaign targeting WhatsApp users with fake OTP verification messages. Learn how to identify and avoid this growing threat.', content: `Cybersecurity researchers at CyberHx have uncovered a new wave of phishing attacks targeting WhatsApp users across India.\n\nHow the scam works:\nVictims receive a message from what appears to be the official WhatsApp support account claiming their account needs verification. The message contains a link that leads to a convincing fake WhatsApp web page that asks for your phone number and OTP.\n\nOnce you enter the OTP, attackers gain full access to your WhatsApp account and immediately start messaging your contacts asking for money or spreading further malware links.\n\nRed flags to watch for:\n• WhatsApp never sends OTPs over chat messages\n• Official support never DMs you first\n• Check the URL carefully — fake sites often use domains like whatsapp-verify.com\n\nWhat to do if targeted:\nDo not click the link. Report the message as spam and block the sender. If you've already entered your OTP, immediately log out all devices from WhatsApp settings and re-enable two-step verification.`, cover_image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80', category: 'Scam Alert', tags: ['WhatsApp', 'Phishing', 'OTP'], author_name: 'Kushagra Dwivedi', author_avatar: 'https://i.ibb.co/kscBzpxZ/Whats-App-Image-2025-07-01-at-1-02-59-AM.jpg', author_role: 'Security Researcher', published_at: '2025-01-15T00:00:00Z', read_time: 5, views: 1247, likes: 89, comments_count: 23, featured: true },
  { id: '2', slug: 'zeus-variant-banks', title: 'Banking Trojan Analysis: Zeus Variant Targeting Indian Banks', excerpt: 'Deep dive into a new Zeus banking trojan variant specifically designed to target major Indian banking institutions.', content: `A new variant of the Zeus banking trojan has been identified by CyberHx malware analysts, specifically crafted to target customers of major Indian banks including SBI, HDFC, and ICICI.\n\nTechnical Analysis:\nThe malware arrives as a seemingly legitimate Android APK disguised as a banking utility app. Once installed, it requests accessibility permissions to overlay fake login screens on top of genuine banking apps.\n\nKey capabilities of this variant:\n• Screen overlay attacks on 12 major Indian banking apps\n• SMS interception to capture OTPs\n• Contact list exfiltration for further spreading\n• Keylogging of credentials entered on any app\n\nInfrastructure:\nThe C2 (command and control) servers are hosted across three countries using bulletproof hosting providers. Communication is encrypted using a custom XOR-based scheme.\n\nMitigation:\nNever install APKs from outside the Google Play Store. Keep your banking apps updated. Enable biometric authentication wherever available.`, cover_image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80', category: 'Malware Analysis', tags: ['Banking Trojan', 'Zeus', 'Malware'], author_name: 'Pankaj Kumar', author_avatar: 'https://media.licdn.com/dms/image/v2/D4D03AQEoIIJDEgVOKQ/profile-displayphoto-shrink_200_200/0/1722410387895', author_role: 'Malware Analyst', published_at: '2025-01-12T00:00:00Z', read_time: 8, views: 892, likes: 67, comments_count: 15, featured: false },
  { id: '3', slug: 'crypto-scam-exposed', title: 'Cryptocurrency Scam: Fake Investment Platform Exposed', excerpt: 'Investigation reveals how scammers are using fake cryptocurrency investment platforms to steal millions from unsuspecting investors.', content: `CyberHx fraud investigators have exposed a large-scale cryptocurrency investment scam that has defrauded victims of over ₹4 crore across multiple states.\n\nThe Operation:\nScammers created a professional-looking platform called "CryptoProfit India" with fake testimonials, fabricated trading charts, and even a bogus regulatory certificate. They advertised heavily on Facebook and Instagram targeting users searching for passive income.\n\nHow victims were recruited:\nStep 1 — Targets receive an Instagram DM from a fake account claiming to be a successful crypto trader.\nStep 2 — They're added to a WhatsApp group full of bots celebrating fake profits.\nStep 3 — Victims deposit small amounts that appear to "grow" rapidly in the app dashboard.\nStep 4 — When they try to withdraw, they're told to pay "tax" or "release fees." The money is never returned.\n\nLegal Action:\nCyberHx has shared evidence with Cyber Crime units in three states. An FIR has been filed and two operators have been identified.`, cover_image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80', category: 'Fraud Investigation', tags: ['Cryptocurrency', 'Investment Scam', 'Fraud'], author_name: 'Shreya Shristi', author_avatar: 'https://i.ibb.co/609FPPt3/IMG-20250430-WA0002-1.jpg', author_role: 'Fraud Investigator', published_at: '2025-01-10T00:00:00Z', read_time: 6, views: 1456, likes: 112, comments_count: 34, featured: true },
  { id: '4', slug: 'social-media-takeover', title: 'Social Media Account Takeover: New Attack Vector', excerpt: 'Discovered a new method attackers are using to take over social media accounts through session hijacking and cookie manipulation.', content: 'Detailed analysis of the session hijacking technique being used to take over social media accounts.', cover_image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80', category: 'Social Engineering', tags: ['Social Media', 'Session Hijacking', 'Privacy'], author_name: 'Sejal Tiwari', author_avatar: 'https://i.ibb.co/0pCqJfQY/Whats-App-Image-2025-04-29-at-8-31-07-PM.jpg', author_role: 'Security Analyst', published_at: '2025-01-08T00:00:00Z', read_time: 4, views: 743, likes: 45, comments_count: 12, featured: false },
  { id: '5', slug: 'email-spoofing-corporate', title: 'Email Spoofing Campaign Targeting Corporate Executives', excerpt: 'Analysis of a sophisticated email spoofing campaign that successfully compromised several high-profile corporate accounts.', content: 'In-depth analysis of the BEC (Business Email Compromise) attack patterns targeting Indian corporates.', cover_image: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&q=80', category: 'Email Security', tags: ['Email Spoofing', 'Corporate Security', 'Phishing'], author_name: 'Pragati Yadav', author_avatar: 'https://media.licdn.com/dms/image/v2/D5603AQG9nMfjIl9GSg/profile-displayphoto-shrink_200_200/0/1733457712693', author_role: 'Security Analyst', published_at: '2025-01-06T00:00:00Z', read_time: 7, views: 634, likes: 38, comments_count: 9, featured: false },
  { id: '6', slug: 'ctf-hackthebox-phantom', title: 'CTF Writeup: HackTheBox — Phantom Machine', excerpt: 'Detailed walkthrough of the Phantom Machine challenge from HackTheBox covering privilege escalation, SUID abuse and lateral movement.', content: `Full writeup of the HackTheBox Phantom machine, rated Hard difficulty.\n\nEnumeration:\nnmap -sC -sV -oA phantom 10.10.11.XXX reveals ports 22 (SSH) and 80 (HTTP). The web server runs Apache 2.4.51 with directory listing enabled.\n\nFoothold:\nA gobuster scan reveals /backup/ directory containing a compressed archive. Inside is a private SSH key with passphrase. John the Ripper cracks the passphrase using rockyou.txt in under 2 minutes.\n\nPrivilege Escalation:\nChecking SUID binaries: find / -perm -4000 2>/dev/null reveals an unusual custom binary /usr/local/bin/admintools. Running it with --help shows it calls system() with user-controlled input — classic command injection. Payload: /usr/local/bin/admintools --exec "bash -p" spawns a root shell.\n\nFlags:\nUser flag: /home/phantom/user.txt\nRoot flag: /root/root.txt\n\nKey takeaways: Always check SUID binaries, and use pspy to monitor processes running as root.`, cover_image: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800&q=80', category: 'CTF Writeups', tags: ['HackTheBox', 'Privilege Escalation', 'Linux'], author_name: 'Aarav Singh', author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80', author_role: 'CTF Player', published_at: '2025-01-04T00:00:00Z', read_time: 12, views: 2103, likes: 156, comments_count: 41, featured: true },
];

// ─── Category colors (same as BlogPage) ──────────────────────────────────────
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

const getSessionId = () => {
  let sid = localStorage.getItem('cyberhx_sid');
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('cyberhx_sid', sid); }
  return sid;
};

// ─── SEO Head Manager ─────────────────────────────────────────────────────────
function useSEO(post: BlogPost | null) {
  useEffect(() => {
    if (!post) return;

    const url = `https://cyberhx.com/blog/${post.slug}`;
    const description = post.excerpt.slice(0, 160);
    const image = post.cover_image || 'https://cyberhx.com/og-image.png';

    // Title
    document.title = `${post.title} | CyberHx Security Blog`;

    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    // Standard meta
    setMeta('meta[name="description"]',       'name',     'description');
    (document.querySelector('meta[name="description"]') as HTMLMetaElement)!.content = description;

    const setMetaContent = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
      el.content = content;
    };
    const setOG = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
      el.content = content;
    };

    setMetaContent('description', description);
    setMetaContent('author', post.author_name);
    setMetaContent('keywords', post.tags.join(', ') + ', cybersecurity, CyberHx, India');
    setMetaContent('robots', 'index, follow');

    // Open Graph
    setOG('og:title', post.title);
    setOG('og:description', description);
    setOG('og:image', image);
    setOG('og:url', url);
    setOG('og:type', 'article');
    setOG('og:site_name', 'CyberHx Security Blog');
    setOG('article:published_time', post.published_at);
    setOG('article:author', post.author_name);
    setOG('article:section', post.category);
    post.tags.forEach(tag => setOG('article:tag', tag));

    // Twitter Card
    setMetaContent('twitter:card', 'summary_large_image');
    setMetaContent('twitter:title', post.title);
    setMetaContent('twitter:description', description);
    setMetaContent('twitter:image', image);
    setMetaContent('twitter:site', '@CyberHx');

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = url;

    // JSON-LD structured data
    const removeOldSchema = () => {
      document.querySelectorAll('script[data-cyberhx-schema]').forEach(el => el.remove());
    };
    removeOldSchema();

    // Article schema
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      image: [image],
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: {
        '@type': 'Person',
        name: post.author_name,
        jobTitle: post.author_role,
        worksFor: { '@type': 'Organization', name: 'CyberHx' },
      },
      publisher: {
        '@type': 'Organization',
        name: 'CyberHx',
        logo: { '@type': 'ImageObject', url: 'https://cyberhx.com/favicon.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      articleSection: post.category,
      keywords: post.tags.join(', '),
      wordCount: (post.content || post.excerpt).split(' ').length,
      url,
    };

    // BreadcrumbList schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberhx.com' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://cyberhx.com/blog' },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    };

    // Person schema for author (helps rank author name searches)
    const personSchema = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: post.author_name,
      jobTitle: post.author_role,
      worksFor: { '@type': 'Organization', name: 'CyberHx', url: 'https://cyberhx.com' },
      image: post.author_avatar,
    };

    [articleSchema, breadcrumbSchema, personSchema].forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-cyberhx-schema', 'true');
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.title = 'CyberHx — Security Blog';
      removeOldSchema();
    };
  }, [post]);
}

// ─── Main BlogPostPage ────────────────────────────────────────────────────────
const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);

  // Apply SEO tags when post loads
  useSEO(post);

  // Load liked state
  useEffect(() => {
    if (!post) return;
    try {
      const liked = new Set<string>(JSON.parse(localStorage.getItem('cyberhx_liked') ?? '[]'));
      setLiked(liked.has(post.id));
      setLocalLikes(post.likes);
    } catch { setLocalLikes(post.likes); }
  }, [post]);

  // Fetch post
  const fetchPost = useCallback(async () => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    try {
      if (IS_CONFIGURED) {
        const data = await sbFetchSingle(slug);
        if (data) { setPost(data); }
        else {
          // fallback to demo
          const demo = DEMO_POSTS.find(p => p.slug === slug);
          demo ? setPost(demo) : setNotFound(true);
        }
      } else {
        const demo = DEMO_POSTS.find(p => p.slug === slug);
        demo ? setPost(demo) : setNotFound(true);
      }
    } catch {
      const demo = DEMO_POSTS.find(p => p.slug === slug);
      demo ? setPost(demo) : setNotFound(true);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  // Increment views
  useEffect(() => {
    if (post && IS_CONFIGURED) {
      sbRpc('increment_post_views', { post_id: post.id }).catch(() => {});
    }
  }, [post]);

  // Handle like
  const handleLike = async () => {
    if (!post) return;
    const sid = getSessionId();
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikes(l => wasLiked ? l - 1 : l + 1);
    try {
      const likedSet = new Set<string>(JSON.parse(localStorage.getItem('cyberhx_liked') ?? '[]'));
      wasLiked ? likedSet.delete(post.id) : likedSet.add(post.id);
      localStorage.setItem('cyberhx_liked', JSON.stringify([...likedSet]));
    } catch {}
    if (IS_CONFIGURED) {
      sbRpc('toggle_post_like', { p_post_id: post.id, p_session_id: sid }).catch(() => {});
    }
  };

  const handleShare = (platform?: string) => {
    if (!post) return;
    const url = `https://cyberhx.com/blog/${post.slug}`;
    const text = `${post.title} — CyberHx Security Blog`;
    if (!platform) {
      if (navigator.share) navigator.share({ title: post.title, text: post.excerpt, url }).catch(() => {});
      else { navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }
    } else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    else if (platform === 'linkedin') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    else if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    else if (platform === 'copy') { navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }
    setShowShareMenu(false);
  };

  const cc = post ? getCat(post.category) : DEFAULT_COLOR;

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-[#05080f] flex items-center justify-center pt-16">
      <div className="text-center">
        <Loader2 size={40} className="text-[#a3e635] animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Loading article…</p>
      </div>
    </div>
  );

  // ── 404 ──
  if (notFound) return (
    <div className="min-h-screen bg-[#05080f] flex items-center justify-center pt-16 px-4">
      <div className="text-center max-w-md">
        <AlertTriangle size={56} className="text-yellow-400 mx-auto mb-5" />
        <h1 className="text-2xl font-bold text-white mb-3">Article Not Found</h1>
        <p className="text-gray-400 mb-8">This article may have been removed or the URL is incorrect.</p>
        <Link to="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-[#a3e635] text-[#05080f] font-bold rounded-xl hover:bg-[#bef264] transition-colors">
          <ArrowLeft size={18} /> Back to Blog
        </Link>
      </div>
    </div>
  );

  if (!post) return null;

  const publishDate = new Date(post.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#05080f] pt-14 sm:pt-16">

      {/* Share copied toast */}
      {shareCopied && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#a3e635] text-[#05080f] px-4 py-2 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 shadow-lg">
          <CheckCircle size={15} /> Link copied!
        </motion.div>
      )}

      {/* Hero / Cover */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
        <img
          src={post.cover_image}
          alt={post.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = 'https://i.ibb.co/gLcY5Nbm/Chat-GPT-Image-May-3-2026-04-46-05-PM.png'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05080f] via-[#05080f]/60 to-transparent" />

        {/* Back button */}
        <div className="absolute top-5 left-4 sm:left-8">
          <button onClick={() => navigate('/blog')}
            className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm hover:bg-black/70 transition-colors">
            <ArrowLeft size={16} /> Blog
          </button>
        </div>

        {/* Category badge on hero */}
        <div className="absolute bottom-6 left-4 sm:left-8">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cc.bg} ${cc.text} ${cc.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
            {post.category}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

        {/* Breadcrumb — SEO + UX */}
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-600 mb-6">
          <Link to="/" className="hover:text-[#a3e635] transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/blog" className="hover:text-[#a3e635] transition-colors">Blog</Link>
          <ChevronRight size={12} />
          <span className={cc.text}>{post.category}</span>
          <ChevronRight size={12} />
          <span className="text-gray-500 truncate max-w-[200px]">{post.title}</span>
        </nav>

        {/* Title */}
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
          {post.title}
        </motion.h1>

        {/* Author + Meta row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-white/8 mb-6">

          {/* Author info */}
          <div className="flex items-center gap-3 flex-1">
            <img
              src={post.author_avatar}
              alt={post.author_name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-[#a3e635]/30 flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = 'https://i.ibb.co/gLcY5Nbm/Chat-GPT-Image-May-3-2026-04-46-05-PM.png'; }}
            />
            <div>
              {/* Author name as searchable heading — helps Google rank "author name CyberHx" */}
              <p className="text-white font-semibold text-sm" itemProp="author">{post.author_name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield size={11} className="text-[#a3e635]" />
                <span>{post.author_role}</span>
                <span>·</span>
                <span>CyberHx</span>
              </div>
            </div>
          </div>

          {/* Date + read time */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><Calendar size={13} />{publishDate}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} />{post.read_time} min read</span>
            <span className="flex items-center gap-1.5"><Eye size={13} />{post.views.toLocaleString()} views</span>
          </div>
        </motion.div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-2 mb-8">
            <Tag size={14} className="text-gray-600 mt-1 flex-shrink-0" />
            {post.tags.map(tag => (
              <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-gray-400 border border-white/8 hover:border-[#a3e635]/30 hover:text-[#a3e635] transition-all">
                #{tag}
              </Link>
            ))}
          </motion.div>
        )}

        {/* Article body */}
        <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`bg-[#0a0f1a] border border-white/8 rounded-2xl p-6 sm:p-8 mb-8 border-l-4 ${cc.accent}`}>

          {/* Excerpt as lead */}
          <p className="text-gray-200 text-base sm:text-lg leading-relaxed mb-6 font-medium border-l-2 border-[#a3e635]/40 pl-4 italic">
            {post.excerpt}
          </p>

          {/* Full content */}
          {post.content && post.content !== post.excerpt && (
            <div className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4">
              {post.content.split('\n\n').map((para, i) => (
                <p key={i} className={para.startsWith('•') || para.match(/^Step \d/) || para.match(/^\d\./) ? 'text-gray-400 pl-2' : ''}>
                  {para}
                </p>
              ))}
            </div>
          )}
        </motion.article>

        {/* Action bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="flex items-center gap-3 mb-10">

          {/* Like */}
          <button onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${liked ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-400 border border-white/8 hover:text-red-400 hover:border-red-500/30'}`}>
            <Heart size={16} className={liked ? 'fill-current' : ''} />
            <span>{localLikes}</span>
          </button>

          <span className="flex items-center gap-1.5 text-gray-500 text-sm">
            <Eye size={15} />{post.views.toLocaleString()}
          </span>

          {/* Share */}
          <div className="relative ml-auto">
            <button onClick={() => setShowShareMenu(s => !s)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/20 hover:bg-[#a3e635]/20 transition-colors text-sm font-medium">
              <Share2 size={15} /> Share
            </button>
            {showShareMenu && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full right-0 mb-2 bg-[#0a0f1a] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[170px] z-10">
                {[
                  { label: '𝕏 Twitter', action: 'twitter' },
                  { label: 'LinkedIn', action: 'linkedin' },
                  { label: 'WhatsApp', action: 'whatsapp' },
                  { label: 'Copy Link', action: 'copy' },
                ].map(s => (
                  <button key={s.action} onClick={() => handleShare(s.action)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                    {s.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Author card — KEY for Google ranking author name searches */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-[#0a0f1a] border border-white/8 rounded-2xl p-6 mb-10 flex gap-5 items-start">
          <img
            src={post.author_avatar}
            alt={`${post.author_name} - CyberHx`}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-[#a3e635]/30 flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).src = 'https://i.ibb.co/gLcY5Nbm/Chat-GPT-Image-May-3-2026-04-46-05-PM.png'; }}
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-base">{post.author_name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${cc.bg} ${cc.text} ${cc.border} border`}>{post.author_role}</span>
            </div>
            <p className="text-gray-500 text-xs mb-2 flex items-center gap-1.5">
              <Shield size={11} className="text-[#a3e635]" /> Security Researcher · CyberHx Community
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              {post.author_name} is a cybersecurity researcher at CyberHx, specializing in {post.category.toLowerCase()} and threat analysis for Indian internet users.
            </p>
            <Link to={`/blog?search=${encodeURIComponent(post.author_name)}`}
              className="inline-flex items-center gap-1.5 text-[#a3e635] text-xs mt-3 hover:underline">
              More articles by {post.author_name} <ExternalLink size={12} />
            </Link>
          </div>
        </motion.div>

        {/* Back to blog */}
        <div className="text-center pb-16">
          <Link to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 rounded-xl transition-all text-sm">
            <ArrowLeft size={16} /> Back to all articles
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPostPage;
