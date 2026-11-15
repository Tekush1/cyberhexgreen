import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { splitLang } from './locales';
import { setLanguage } from './runtime';

/** Keeps the page in the language of its URL, and keeps clicks on translated links inside the router.
    (Translated links carry their /es/… href; React Router's Link would still navigate to its English `to`,
    so a click on such a link is taken over here, before React sees it.) */
export function LocaleSync() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { lang } = splitLang(pathname);

  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (!lang) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') || '';
      if (!href.startsWith(`/${lang}/`) && href !== `/${lang}` && !href.startsWith(`/${lang}#`) && !href.startsWith(`/${lang}?`)) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [lang, navigate]);

  return null;
}
