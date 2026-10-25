import { useCallback, useEffect, useRef, useState } from 'react';
import { ShopMascot } from '../../components/shared/ShopMascot';
import { initShopSound, playShopSound, setSoundScope, type ShopSound } from '../../lib/shopSound';

/* The blog's corner companion: the same stage as the shop mascot, with 30 blog
   poses. It reacts to what the visitor does on the blog home, while reading a
   post, and in the editor. Sound is off by default here (speaker button on the
   mascot turns it on). Every line is factual; nothing pushy. */

export type BlogFrame =
  | 'happy' | 'think' | 'idea' | 'pencil' | 'start' | 'research' | 'checklist' | 'review' | 'upload' | 'published'
  | 'standing' | 'wonder' | 'bright' | 'pencil-2' | 'writing' | 'typing' | 'detective' | 'angry' | 'love' | 'victory'
  | 'thumbs' | 'wave' | 'shocked' | 'sleepy' | 'crying' | 'cool' | 'confused' | 'reading' | 'pointing' | 'trophy';

type ListSignals = {
  mode: 'list';
  state: 'loading' | 'ready' | 'more' | 'error';
  total: number;
  filtering: boolean;
  q: string;
  category: string;
  tag: string;
};
type PostSignals = {
  mode: 'post';
  state: 'loading' | 'ready' | 'missing' | 'error';
  liked: boolean;
  copied: boolean;
  progress: number;
  minutes?: number;
};
type EditorSignals = {
  mode: 'editor';
  choosing: boolean;
  view: 'write' | 'preview' | 'split';
  hasTitle: boolean;
  words: number;
  hasCover: boolean;
  uploads: number;
  errors: number;
  busy: string;
  dragging: boolean;
  /** First line when the editor opens on a fresh draft (not a restored one). */
  greeting?: string;
};
export type CompanionSignals = ListSignals | PostSignals | EditorSignals;

// Preload only what each area can show.
const FRAMES: Record<CompanionSignals['mode'], BlogFrame[]> = {
  list: ['wave', 'happy', 'detective', 'thumbs', 'confused', 'pointing', 'idea', 'bright', 'reading', 'sleepy', 'crying', 'think'],
  post: ['reading', 'cool', 'victory', 'love', 'thumbs', 'pointing', 'confused', 'crying', 'wave'],
  editor: ['pencil', 'research', 'angry', 'checklist', 'start', 'pencil-2', 'typing', 'writing', 'thumbs', 'detective', 'upload',
    'review', 'reading', 'cool', 'shocked', 'sleepy', 'wonder', 'trophy', 'standing'],
};
const TAG = { list: 'Blog · Live', post: 'Reading buddy', editor: 'Writing buddy' } as const;

// Sounds (only heard if the visitor turns blog sound on).
const SOUND: Partial<Record<BlogFrame, ShopSound>> = {
  idea: 'discover', bright: 'discover', reading: 'discover', pointing: 'discover', detective: 'discover',
  thumbs: 'pick', cool: 'pick', love: 'pick', upload: 'add', checklist: 'bill', shocked: 'sad', crying: 'sad',
  victory: 'cheer', trophy: 'cheer', angry: 'bill', research: 'discover', start: 'ready', wave: 'ready',
};
const RESTING = new Set<BlogFrame>(['happy', 'standing', 'reading', 'pencil', 'pencil-2', 'writing', 'research', 'think']);

const fine = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

export function BlogCompanion({ signals, raised = false }: { signals: CompanionSignals; raised?: boolean }) {
  const mode = signals.mode;
  const [frame, setFrame] = useState<BlogFrame>(mode === 'editor' ? 'pencil' : mode === 'post' ? 'reading' : 'happy');
  const [bubble, setBubble] = useState<string | undefined>();
  const [celebrate, setCelebrate] = useState(0);
  const frameRef = useRef(frame);
  const restRef = useRef<BlogFrame>(frame);
  const timer = useRef<number>();
  const prev = useRef<CompanionSignals>(signals);
  const once = useRef(new Set<string>());
  const sig = useRef(signals);
  sig.current = signals;

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const act = useCallback((f: BlogFrame, line?: string, ms?: number, sound: ShopSound | null | undefined = undefined) => {
    window.clearTimeout(timer.current);
    const s = sound === undefined ? SOUND[f] : sound;
    if (s) playShopSound(s);
    setFrame(f);
    setBubble(line);
    if (ms) timer.current = window.setTimeout(() => setFrame(restRef.current), ms);
  }, []);
  const first = (k: string) => (once.current.has(k) ? false : (once.current.add(k), true));

  // Sound: blog settings (off unless the visitor turned it on).
  useEffect(() => {
    setSoundScope('blog');
    initShopSound();
    return () => window.clearTimeout(timer.current);
  }, []);

  /* ---------- resting pose follows the page state ---------- */
  useEffect(() => {
    let rest: BlogFrame = 'happy';
    if (signals.mode === 'post') rest = signals.state === 'ready' ? 'reading' : 'standing';
    if (signals.mode === 'editor') {
      rest = signals.choosing
        ? 'pencil'
        : signals.words > 1000
          ? 'research'
          : signals.words > 0 || signals.hasTitle
            ? 'writing'
            : 'pencil-2';
    }
    if (signals.mode === 'list') rest = signals.state === 'error' ? 'crying' : signals.filtering && signals.total === 0 && signals.state === 'ready' ? 'think' : 'happy';
    const changed = restRef.current !== rest;
    restRef.current = rest;
    if (changed && RESTING.has(frameRef.current)) setFrame(rest);
  });

  /* ---------- greeting (also covers a post that finished loading before we mounted) ---------- */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const s0 = sig.current;
      if (mode === 'list') act('wave', 'Welcome! Grab a read, or write your own.', 2600, null);
      if (mode === 'editor')
        act(
          restRef.current,
          s0.mode === 'editor' && s0.choosing
            ? 'What are we writing today?'
            : (s0.mode === 'editor' && s0.greeting) || 'Welcome back! Your draft is right where you left it.',
          undefined,
          null,
        );
      if (mode === 'post' && s0.mode === 'post' && s0.state === 'ready')
        act('reading', `Enjoy the read${s0.minutes ? ` · ${s0.minutes} min` : ''}.`, 2800, null);
    }, 350);
    return () => window.clearTimeout(t);
  }, [mode, act]);

  /* ---------- reactions to state changes ---------- */
  useEffect(() => {
    const p = prev.current;
    prev.current = signals;
    if (p.mode !== signals.mode) return;

    if (signals.mode === 'list' && p.mode === 'list') {
      if (signals.state === 'error' && p.state !== 'error') act('crying', "The blog couldn't load right now. Please try again soon.");
      if (signals.state === 'ready' && p.state === 'loading' && signals.filtering) {
        if (signals.total === 0) act('confused', 'Hmm, nothing matches. Try a shorter word.', 3200);
        else act('thumbs', `Found ${signals.total} post${signals.total === 1 ? '' : 's'}.`, 2200);
      }
      if (signals.category !== p.category && signals.category) act('pointing', `Showing ${signals.category}.`, 2000);
      if (signals.tag !== p.tag && signals.tag) act('pointing', `Posts tagged #${signals.tag}.`, 2000);
    }

    if (signals.mode === 'post' && p.mode === 'post') {
      if (signals.state === 'ready' && p.state !== 'ready')
        act('reading', `Enjoy the read${signals.minutes ? ` · ${signals.minutes} min` : ''}.`, 2800, null);
      if (signals.state === 'missing' && p.state !== 'missing') act('confused', "Hmm, this post isn't here anymore.");
      if (signals.state === 'error' && p.state !== 'error') act('crying', "This post couldn't load. Please try again.");
      if (signals.liked && !p.liked) act('love', 'Thanks for the love!', 2400);
      if (signals.copied && !p.copied) act('thumbs', 'Link copied. Share away!', 2000);
      if (signals.progress >= 50 && p.progress < 50 && first('half')) act('cool', 'Halfway there. Nice!', 2000);
      if (signals.progress >= 97 && p.progress < 97 && first('end')) {
        act('victory', 'You finished it! Share it if it helped.', 3600);
        setCelebrate((n) => n + 1);
      }
    }

    if (signals.mode === 'editor' && p.mode === 'editor') {
      if (!signals.choosing && p.choosing) act('start', "Let's go! Start with a clear title.", 2600);
      if (signals.hasTitle && !p.hasTitle && first('title')) act('thumbs', 'Great title.', 1800);
      if (signals.words >= 80 && p.words < 80 && !signals.hasCover && first('w80')) act('start', 'Nice start! Add a cover image next.', 3000);
      if (signals.words >= 1000 && p.words < 1000 && first('w1000')) act('detective', "Deep dive! Add headings so it's easy to scan.", 3200);
      if (signals.dragging && !p.dragging) act('upload', "Drop it here, I'll upload it.");
      if (!signals.dragging && p.dragging && signals.uploads === 0) act(restRef.current);
      if (signals.uploads > p.uploads) act('upload', 'Uploading your image…');
      if (signals.uploads === 0 && p.uploads > 0 && signals.errors <= p.errors) act('thumbs', 'Uploaded!', 1800);
      if (signals.view !== p.view) {
        if (signals.view === 'preview') act('review', 'Looks good. Give it one last read.', 3000);
        else if (signals.view === 'split') act('reading', 'Writing and preview, side by side.', 2400);
        else act(restRef.current);
      }
      if ((signals.busy === 'submit' || signals.busy === 'publish') && !p.busy) act('typing', 'Sending it over…');
      if (signals.busy === 'draft' && !p.busy) act('typing', 'Saving your draft…');
      if (!signals.busy && p.busy) {
        // Errors after a send/save attempt came back from the server.
        if (signals.errors > 0) act('shocked', "Couldn't send that. Check the message above and try again.", 4200);
        else if (p.busy === 'draft') act('cool', 'Draft saved.', 2200);
        else if (p.busy === 'publish') {
          act('trophy', 'Published! Nice work.', 3600);
          setCelebrate((n) => n + 1);
        } else act(restRef.current);
      } else if (signals.errors > p.errors && !signals.busy) {
        // Errors without a send in progress are the checks before sending (missing fields).
        act('checklist', `Almost there: ${signals.errors} thing${signals.errors === 1 ? '' : 's'} to fix above.`, 4200);
      }
    }
  });

  /* ---------- typing, hovers and idle (DOM) ---------- */
  useEffect(() => {
    let typingTimer = 0;
    let lastHover = 0;
    const onInput = (e: Event) => {
      const t = e.target as HTMLElement;
      if (mode === 'list' && t.matches('input[data-companion="search"]') && (t as HTMLInputElement).value.trim()) {
        if (frameRef.current !== 'detective') act('detective', `Searching for “${(t as HTMLInputElement).value.trim().slice(0, 24)}”…`);
        else setBubble(`Searching for “${(t as HTMLInputElement).value.trim().slice(0, 24)}”…`);
      }
      if (mode === 'editor' && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'text'))) {
        if (!['typing', 'upload', 'review', 'checklist', 'thumbs', 'start', 'detective'].includes(frameRef.current)) act('typing', undefined, undefined, null);
        window.clearTimeout(typingTimer);
        typingTimer = window.setTimeout(() => frameRef.current === 'typing' && act(restRef.current), 1400);
      }
    };
    const onOver = (e: PointerEvent) => {
      if (!fine()) return;
      const el = (e.target as Element | null)?.closest?.('a, button, [data-tpl]');
      if (!el) return;
      const now = Date.now();
      if (now - lastHover < 1400 || !RESTING.has(frameRef.current)) return;
      const href = el.getAttribute('href') ?? '';
      const tpl = el.getAttribute('data-tpl');
      if (mode === 'list') {
        if (href === '/blog/write') act(first('idea') ? 'idea' : 'bright', 'Got an idea? Write for CyberHx!', 2400);
        else if (/^\/blog\/[^/]+$/.test(href)) act('reading', 'Good pick. Enjoy!', 1800);
        else return;
      } else if (mode === 'post') {
        if (/twitter\.com\/intent|linkedin\.com\/sharing|wa\.me/.test(href)) act('pointing', 'Share it with your team.', 1800);
        else return;
      } else if (mode === 'editor' && tpl) {
        const m: Record<string, [BlogFrame, string]> = {
          ctf: ['research', 'A write-up! Walk them through it step by step.'],
          scam: ['angry', "Scammers again? Let's warn people."],
          tutorial: ['checklist', 'A tutorial: clear steps, one at a time.'],
          blank: ['start', 'A blank page. Anything goes!'],
        };
        if (!m[tpl]) return;
        act(m[tpl][0], m[tpl][1], 2600);
      } else return;
      lastHover = now;
    };
    // Idle: a sleepy look after a long pause (not while reading a post).
    let idle = 0;
    const armIdle = () => {
      window.clearTimeout(idle);
      if (frameRef.current === 'sleepy') act('wave', 'Welcome back!', 1500, null);
      if (mode === 'post') return;
      idle = window.setTimeout(() => {
        if (!RESTING.has(frameRef.current)) return armIdle();
        act('sleepy', mode === 'editor' ? 'Taking a break? Your draft is saved on this device.' : 'Still there? Any post is a good start.', undefined, null);
      }, mode === 'editor' ? 60000 : 30000);
    };
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    document.addEventListener('input', onInput, true);
    document.addEventListener('pointerover', onOver, { passive: true });
    evs.forEach((ev) => window.addEventListener(ev, armIdle, { passive: true }));
    armIdle();
    return () => {
      window.clearTimeout(typingTimer);
      window.clearTimeout(idle);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('pointerover', onOver);
      evs.forEach((ev) => window.removeEventListener(ev, armIdle));
    };
  }, [mode, act]);

  return (
    <ShopMascot
      frame={frame}
      bubble={bubble}
      celebrate={celebrate}
      raised={raised}
      folder="/mascots/blog"
      frames={FRAMES[mode]}
      tag={TAG[mode]}
      stickyFrames={['upload', 'crying', 'sleepy']}
    />
  );
}

export default BlogCompanion;
