# Prospect Finder

Prospect Finder is a solo-use business prospecting tool for freelance web developers. It searches OpenStreetMap business data through the Overpass API, finds businesses with no website, and helps organize outreach in separate Prospect and Contacted lists.

## Tech Stack

- Frontend: React (Vite), Tailwind CSS, Axios, lucide-react
- Backend: Node.js, Express
- Storage: local JSON files with Render persistent disk support
- Data source: Overpass API

## Local Startup

### Option 1: Project Root

1. `cd c:\projects\get_contacts`
2. `npm install`
3. `npm run build`
4. `npm run dev`

### Option 2: Two Terminals

1. `cd server && npm install && node index.js`
2. `cd client && npm install && npm run dev`

Backend runs on port `3001`.

Frontend runs on port `5173` in local dev.

No environment variables or API keys are required.

## Render Deployment

Create a `Web Service` on Render with these settings:

- Root Directory: leave blank
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

Add a Persistent Disk:

- Mount path: `/var/data`
- Size: any small size is fine to start

Render will provide the `PORT` environment variable automatically.
The app will use `/var/data/get-contacts` for `data.json` and `search-cache.json` when deployed.

After deployment, your public site will load from the same Render URL and the API will be served from the same service.
