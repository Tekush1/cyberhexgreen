// Tell Bing, Yandex, Naver and Seznam (IndexNow) about every URL in the live sitemap.
// Run after a deploy that adds or changes pages:  node scripts/indexnow.mjs
// The key file public/a21c8f8c2130972dfeff7182a13c37ab.txt proves the site is ours; it is meant to be public.
const KEY = 'a21c8f8c2130972dfeff7182a13c37ab';
const HOST = 'cyberhx.com';
const xml = await (await fetch('https://' + HOST + '/sitemap.xml')).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList }),
});
console.log('IndexNow', r.status, urlList.length, 'URLs');
