/* Standalone backend for self-hosting.
   On claude.ai the platform provides window.claude (shared database + viewer identity);
   this file does nothing there. Anywhere else it provides the same API backed by the
   browser's localStorage, so data persists per browser/device (it is NOT shared between users).
   To share data between users, replace this file with an adapter to a real database
   (Firebase, Supabase, etc.) that implements: use('db') -> {doc(path), collection(name)}
   and use('user') -> {id(), isOwner()}. */
(function () {
  if (window.claude && window.claude.use) return;
  const KEY = 'nevara_db_v1', VIEWER = 'local-viewer';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const subs = new Set(), fire = () => subs.forEach(f => f());
  window.addEventListener('storage', e => { if (e.key === KEY) fire(); });
  const ref = p => ({
    id: p.split('/').pop(), path: p,
    async get() { const v = load()[p]; return { id: p.split('/').pop(), exists: v !== undefined, data: () => v }; },
    async set(v) { const d = load(); d[p] = JSON.parse(JSON.stringify(v)); save(d); fire(); },
    async update(v) { const d = load(); d[p] = Object.assign({}, d[p], v); save(d); fire(); },
    async delete() { const d = load(); delete d[p]; save(d); fire(); }
  });
  const col = c => ({
    doc: id => ref(c + '/' + id),
    onSnapshot(next) {
      const f = () => { const d = load(); next({ docs: Object.keys(d).filter(k => k.startsWith(c + '/')).map(k => ({ id: k.slice(c.length + 1), data: () => d[k] })) }); };
      subs.add(f); setTimeout(f, 0); return () => subs.delete(f);
    }
  });
  const db = { doc: ref, collection: col };
  const user = { id: async () => VIEWER, isOwner: async () => true };
  window.claude = { use: async n => (n === 'db' ? db : n === 'user' ? user : null) };
})();
