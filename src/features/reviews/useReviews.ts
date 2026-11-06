import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { FbRow } from './FeedbackCharts';

/* Public reviews: quotes picked in Admin -> Feedback (table site_reviews, published only)
   and totals from review_stats() (no personal data). Shared by /reviews and the homepage section. */

export interface Review { id: string; quote: string; author: string; team: string; event_name: string; rating: number | null }
export interface ReviewStats {
  responses: number; avg: number | null; happy_pct: number | null; more_pct: number | null;
  events: { name: string; responses: number; avg: number | null }[];
  categories: { name: string; n: number }[];
}

let cache: { reviews: Review[]; stats: ReviewStats | null; answers: FbRow[] } | null = null;

/** withAnswers: also load every (anonymous) answer for the charts on /reviews. */
export function useReviews(withAnswers = false) {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (cache && (!withAnswers || cache.answers.length)) return;
    let live = true;
    Promise.all([
      supabase.from('site_reviews').select('id,quote,author,team,event_name,rating').eq('published', true).order('sort').order('created_at', { ascending: false }).limit(120),
      supabase.rpc('review_stats'),
      withAnswers ? supabase.rpc('public_feedback') : Promise.resolve({ data: [], error: null }),
    ]).then(([r, s, a]) => {
      if (!live) return;
      if (r.error && s.error) { setError(true); return; }
      const answers = ((a.data as { id: number; created_at: string; data: FbRow['data'] }[]) || [])
        .map((x) => ({ id: String(x.id), name: '', email: '', message: null, data: x.data, created_at: x.created_at }));
      cache = { reviews: (r.data as Review[]) || [], stats: (s.data as ReviewStats) || null, answers };
      setData(cache);
    }).catch(() => live && setError(true));
    return () => { live = false; };
  }, [withAnswers]);
  return { reviews: data?.reviews || [], stats: data?.stats || null, answers: data?.answers || [], loading: !data && !error, error };
}

/** "Null Origin CTF 2026" -> "Null Origin CTF". */
export const shortEvent = (n: string) => n.replace(/\s+20\d\d$/, '');
