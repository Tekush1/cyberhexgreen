/**
 * Illustrated replacements for the decorative lucide icons (shield, skull, trophy, …).
 * Same names as lucide so a page only has to change its import line.
 * They render the CyberHx PNG artwork, roughly twice the old size, with no box around it.
 * Small UI icons (arrows, chevrons, calendar, mail, social logos) stay on lucide.
 */
import type React from 'react';
import { SiteIcon, type IconName } from './SiteIcon';

type Props = { size?: number | string; className?: string; strokeWidth?: number; style?: React.CSSProperties };

const tailwindSize = (cls = '') => {
  const m = cls.match(/(?:^|\s)w-(\d+(?:\.\d+)?)(?:\s|$)/);
  return m ? parseFloat(m[1]) * 4 : undefined;
};

const keepLayout = (cls = '') =>
  cls
    .split(/\s+/)
    .filter((c) => /^(m[trblxy]?-|-m|mx-auto|block|inline|hidden|absolute|relative|top-|left-|right-|bottom-|z-|shrink|flex-shrink|self-|order-|sm:|md:|lg:)/.test(c) && !/text-|w-|h-/.test(c))
    .join(' ');

const make = (name: IconName) => {
  const Icon = ({ size, className }: Props) => {
    const base = Number(size) || tailwindSize(className) || 24;
    const px = base <= 14 ? 26 : Math.min(120, Math.max(34, Math.round(base * 2)));
    return <SiteIcon name={name} size={px} className={keepLayout(className)} />;
  };
  return Icon;
};

export const Shield = make('shield');
export const Skull = make('ghost');
export const Terminal = make('code');
export const Code = make('code-light');
export const Trophy = make('trophy');
export const Target = make('target');
export const Zap = make('hexagon');
export const Flag = make('ctf-green');
export const Award = make('podium');
export const Star = make('podium-flat');
export const Rocket = make('hacker-climb');
export const Brain = make('gear');
export const Cpu = make('gear');
export const Lock = make('shield');
export const Radio = make('satellite');
export const Briefcase = make('toolbox');
export const Sparkles = make('hexagon');
export const Users = make('hacker-team');
export const BookOpen = make('code');
export const Book = make('code');
export const Server = make('network');
export const Megaphone = make('satellite');
export const GamepadIcon = make('swords');
export const Sword = make('swords');
export const Handshake = make('hacker-team');
export const Building2 = make('network');
export const BarChart3 = make('gauge');
export const Eye = make('eyes');
export const AlertTriangle = make('bug');
export const GraduationCap = make('hacker-climb');
