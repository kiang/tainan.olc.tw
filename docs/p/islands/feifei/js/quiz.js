// 「你是哪一種台南人？」：計分與結果編碼（畫面在 play.js）
export function scoreQuiz(D, answers) {
  const items = new Map();
  D.islands.forEach((isl) => isl.items.forEach((it, i) => items.set(it.id, { id: it.id, isl: isl.id, order: items.size, i })));
  const score = new Map();
  D.quiz.questions.forEach((q, qi) => {
    const opt = q.options[answers[qi]];
    if (!opt) return;
    for (const [id, w] of Object.entries(opt.w)) if (items.has(id)) score.set(id, (score.get(id) || 0) + w);
  });
  // 類型：加總最高的政策島（大台南是共同的起點，不算一種類型）
  const byIsl = new Map();
  for (const [id, s] of score) {
    const isl = items.get(id).isl;
    if (D.quiz.types[isl]) byIsl.set(isl, (byIsl.get(isl) || 0) + s);
  }
  const typeOrder = Object.keys(D.quiz.types);
  const type = [...byIsl].sort((a, b) => b[1] - a[1] || typeOrder.indexOf(a[0]) - typeOrder.indexOf(b[0]))[0]?.[0] || typeOrder[0];
  // 最有關的 3 個細項：自己類型的島取 2 個，再加上其他島最有關的 1 個
  const ranked = [...score].map(([id, s]) => ({ ...items.get(id), s })).filter((r) => D.quiz.types[r.isl]).sort((a, b) => b.s - a.s || a.order - b.order);
  const picks = ranked.filter((r) => r.isl === type).slice(0, 2);
  for (const r of ranked) {
    if (picks.length >= 3) break;
    if (r.isl !== type) picks.push(r);
  }
  return { type, items: picks.map((p) => p.id) };
}

// 分享用的網址片段：#quiz=transport.tr-blue.tr-roads.tech-sci
export const encodeResult = (r) => `quiz=${[r.type, ...r.items].join(".")}`;
export function decodeResult(D, s) {
  const [type, ...ids] = String(s || "").split(".");
  if (!D.quiz.types[type]) return null;
  const known = new Set(D.islands.flatMap((isl) => isl.items.map((it) => it.id)));
  const items = [...new Set(ids)].filter((id) => known.has(id)).slice(0, 3);
  return items.length ? { type, items } : null;
}
