import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

/* Public reviews: quotes picked in Admin -> Feedback (table site_reviews, published only)
   and totals from review_stats() (no personal data). Shared by /reviews and the homepage section. */

export interface Review { id: string; quote: string; author: string; team: string; event_name: string; rating: number | null }
export interface ReviewStats {
  responses: number; avg: number | null; happy_pct: number | null; more_pct: number | null;
  events: { name: string; responses: number; avg: number | null }[];
  categories: { name: string; n: number }[];
}

let cache: { reviews: Review[]; stats: ReviewStats | null } | null = null;

export function useReviews() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (cache) return;
    let live = true;
    Promise.all([
      supabase.from('site_reviews').select('id,quote,author,team,event_name,rating').eq('published', true).order('sort').order('created_at', { ascending: false }).limit(120),
      supabase.rpc('review_stats'),
    ]).then(([r, s]) => {
      if (!live) return;
      if (r.error && s.error) { setError(true); return; }
      cache = { reviews: (r.data as Review[]) || [], stats: (s.data as ReviewStats) || null };
      setData(cache);
    }).catch(() => live && setError(true));
    return () => { live = false; };
  }, []);
  return { reviews: data?.reviews || [], stats: data?.stats || null, loading: !data && !error, error };
}

/** "Null Origin CTF 2026" -> "Null Origin CTF". */
export const shortEvent = (n: string) => n.replace(/\s+20\d\d$/, '');
