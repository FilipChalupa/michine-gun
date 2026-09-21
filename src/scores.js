// Local top-5 leaderboard (localStorage; per browser, nothing leaves the device).
const KEY = 'misine-scores', NAME_KEY = 'misine-name', MAX = 5;

export function loadScores() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter(r => r && isFinite(r.score)).sort((a, b) => b.score - a.score).slice(0, MAX) : [];
  } catch (e) { return []; }
}
export function qualifies(score) {
  const list = loadScores();
  return score > 0 && (list.length < MAX || score > list[list.length - 1].score);
}
// Returns the saved row so the table can highlight it.
export function addScore(name, score, wave) {
  const row = { name: (name || '').trim().slice(0, 12) || 'Anonym', score, wave, date: new Date().toISOString().slice(0, 10), id: Date.now() };
  const list = [...loadScores(), row].sort((a, b) => b.score - a.score).slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(list)); localStorage.setItem(NAME_KEY, row.name); } catch (e) {}
  return row;
}
export function lastName() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } }
