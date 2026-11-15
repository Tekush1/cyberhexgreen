import { Globe, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LANGS, LANG_NAMES, isTranslated, localize, splitLang, type Lang } from './locales';

/** Language picker. On a translated page it switches to the same page in the chosen language;
    on a page that is English only, it goes to the chosen language's home page. */
export function LangSwitch({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const { lang, path } = splitLang(pathname);
  const value = lang ?? 'en';

  const go = (next: string) => {
    if (next === value) return;
    if (next === 'en') navigate(path + hash);
    else if (isTranslated(path)) navigate(localize(path, next as Lang) + hash);
    else navigate(`/${next}`);
  };

  return (
    <label
      data-no-translate
      className={`relative inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/75 transition-colors hover:border-white/25 hover:text-white ${compact ? 'h-11 px-3 text-sm' : 'h-11 px-3.5 text-[15px]'} ${className}`}
    >
      <Globe size={16} aria-hidden="true" className="shrink-0" />
      <span className="font-medium">{compact ? value.toUpperCase() : LANG_NAMES[value]}</span>
      <ChevronDown size={14} aria-hidden="true" className="shrink-0 opacity-60" />
      <select
        aria-label="Language"
        value={value}
        onChange={(e) => go(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="en" lang="en">{LANG_NAMES.en}</option>
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>{LANG_NAMES[l]}</option>
        ))}
      </select>
    </label>
  );
}
