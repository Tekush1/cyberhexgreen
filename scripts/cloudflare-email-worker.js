// Cloudflare Email Worker for mail@cyberhx.com
// 1) Delivers every email exactly as before (forwards to your normal inbox, or several inboxes).
// 2) Sends a copy to cyberhx.com, which keeps it ONLY if it's a reply from an Outreach lead
//    (shows up in Admin → Outreach → Inbox). Everything else is ignored there.
//
// Setup (Cloudflare dashboard, no code tools needed):
//   Workers & Pages → Create → Worker → name it "mail-inbound" → Deploy → Edit code → paste this file → Deploy
//   Worker → Settings → Variables and Secrets:
//     FORWARD_TO      (Text)    your inbox(es) - the address mail@cyberhx.com forwards to today; several allowed, comma separated
//                               (every address must be a verified destination in Email Routing → Destination addresses)
//     INBOUND_SECRET  (Secret)  the value from Supabase: SELECT value FROM app_secrets WHERE name = 'inbound';
//   cyberhx.com → Email → Email Routing → Routing rules → mail@cyberhx.com → Edit → Action: "Send to a Worker" → mail-inbound

export default {
  async email(message, env, ctx) {
    let raw = '';
    try {
      // Keep the copy small enough for the API (attachments are not needed to read a reply).
      const buf = await new Response(message.raw).arrayBuffer();
      raw = new TextDecoder().decode(buf.byteLength > 3_500_000 ? buf.slice(0, 3_500_000) : buf);
    } catch (e) {
      console.log('could not read raw email', e);
    }

    // Normal delivery first: this must never be skipped.
    // FORWARD_TO can be one inbox or several, comma separated (each must be a verified destination in Email Routing).
    const inboxes = String(env.FORWARD_TO || '').split(',').map((x) => x.trim()).filter(Boolean);
    for (const to of inboxes) {
      try { await message.forward(to); } catch (e) { console.log('forward failed', to, e); }
    }

    if (raw && env.INBOUND_SECRET) {
      ctx.waitUntil(
        fetch('https://cyberhx.com/api/outreach', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'x-inbound-secret': env.INBOUND_SECRET,
            'x-mail-from': message.from,
            'x-mail-to': message.to,
          },
          body: raw,
        })
          .then((r) => console.log('panel copy', r.status))
          .catch((e) => console.log('panel copy failed', e)),
      );
    }
  },
};
