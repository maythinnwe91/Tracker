# Money tracker

Tracks kyat received, kyat-to-baht exchanges and baht spent, with balances.
Anyone with the link can view, add and delete entries.

## Files
- public/index.html: the app page
- netlify/functions/api.mts: saves entries online (Netlify Blobs)
- netlify.toml, package.json: Netlify settings and libraries

## Deploy
1. Upload this folder to Netlify (GitHub repo, or the Netlify CLI: `npm install`, then `netlify deploy --prod`).
2. Open the site and start adding entries.

Your current 4 entries are added automatically the first time the site loads.

