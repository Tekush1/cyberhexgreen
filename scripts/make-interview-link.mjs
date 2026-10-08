#!/usr/bin/env node
// Usage:
//   INTERVIEW_LINK_SECRET=xxx SITE_URL=https://yoursite.com \
//     node scripts/make-interview-link.mjs "Vansika Sharma" vansika@gmail.com [validDays=7]
//
// Prints a private booking link to send to a shortlisted candidate.

import crypto from 'node:crypto';

const [name, email, days = '7'] = process.argv.slice(2);
const secret = process.env.INTERVIEW_LINK_SECRET;
const site = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

if (!name || !email || !secret) {
  console.error('Usage: INTERVIEW_LINK_SECRET=... SITE_URL=... node scripts/make-interview-link.mjs "Name" email@x.com [validDays]');
  process.exit(1);
}

const payload = {
  id: crypto.randomUUID(),
  n: name,
  e: email,
  x: Math.floor(Date.now() / 1000) + Number(days) * 86400,
};
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');

console.log(`${site}/book-interview?t=${body}.${sig}`);
