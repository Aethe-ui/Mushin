# Mushin Frontend

This folder contains the static frontend for Mushin.

How to run (from repository root):

1. Install dev dependencies (installs the static server `serve`):

   npm install

2. Start the frontend server (serves `mushin-frontend` on port 3000):

   npm run start:frontend

Alternative (no install):

npx serve -s mushin-frontend -l 3000

Notes:

- The `start:frontend` script uses the `serve` package to serve the static folder.
- If you prefer a live-reload dev server, you can install `live-server` or use tools like Vite/Parcel for a modern dev setup.
