#!/usr/bin/env node
// Test new fetch-based PitchOdds parser logic.

const html = await (await fetch("https://pitch-odds.vercel.app/")).text();
const cardRe = /<a[^>]+href="\/match\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
let count = 0;
const parsed = [];

for (const [, matchId, inner] of html.matchAll(cardRe)) {
  count++;
  const dt = inner.match(
    /<span>([A-Z][a-z]+,\s*[A-Z][a-z]+\s+\d{1,2})<\/span>\s*<span>(\d{1,2}:\d{2}\s*[AP]M)<\/span>/i
  );
  const teams = [...inner.matchAll(/<!--\s*-->\s*([^<]+?)<\/span>/g)].map((m) => m[1].trim());
  const home = inner.match(/width:\s*([\d.]+)%[^"]*background:\s*var\(--home\)/i);
  const draw = inner.match(/width:\s*([\d.]+)%[^"]*background:\s*var\(--draw\)/i);
  const away = inner.match(/width:\s*([\d.]+)%[^"]*background:\s*var\(--away\)/i);

  if (dt && teams.length >= 2 && home && draw && away) {
    const ranked = [
      { o: "home", p: +home[1] },
      { o: "draw", p: +draw[1] },
      { o: "away", p: +away[1] },
    ].sort((a, b) => b.p - a.p);
    parsed.push({
      matchId,
      date: dt[1],
      time: dt[2],
      home: teams[0],
      away: teams[1],
      pick: ranked[0].o,
      prob: Math.round(ranked[0].p),
    });
  }
}

console.log(`total cards: ${count}, fully parseable: ${parsed.length}\n`);

// Today in Africa/Lagos as "Wed, Jun 24" format
const todayLagos = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  month: "short",
  day: "numeric",
}).format(new Date());

const todays = parsed.filter((p) => p.date === todayLagos);
console.log(`today (${todayLagos}): ${todays.length} matches\n`);
console.log("today's matches sorted by confidence:");
for (const p of todays.sort((a, b) => b.prob - a.prob).slice(0, 10)) {
  console.log(`  ${p.time}  ${p.home.padEnd(20)} vs ${p.away.padEnd(20)}  →  ${p.pick} ${p.prob}%`);
}

if (todays.length > 0) {
  const top = todays[0];
  console.log(`\nSTANDOUT: ${top.home} vs ${top.away} — ${top.pick} ${top.prob}%`);
}
