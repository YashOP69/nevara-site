# NEVARA – Share. Access. Repeat.

Static website (no build step, no dependencies).

```
index.html
css/styles.css
js/app.js
js/local-backend.js
```

## Run locally
Open `index.html`, or serve the folder: `python3 -m http.server 8000` then visit http://localhost:8000

## Deploy
Upload the whole folder to any static host (Netlify drag-and-drop, Vercel, GitHub Pages, Cloudflare Pages, S3, etc.). The entry point is `index.html`.

## Data & backend
- Accounts, listings, bookings and reviews are saved by `js/local-backend.js` in the visitor's own browser (localStorage). It works offline but data is **per browser, not shared** between users.
- The first account you create on a device is the admin (Admin Panel access).
- For a real multi-user site, replace `js/local-backend.js` with an adapter to a hosted database (Firebase, Supabase, etc.) that provides `claude.use('db')` (`doc(path)`, `collection(name)` with `get/set/update/delete/onSnapshot`) and `claude.use('user')` (`id()`, `isOwner()`). `js/app.js` needs no changes.
- Login has no password verification (identity comes from the backend). Add real authentication before public launch.
