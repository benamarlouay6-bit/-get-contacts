# Prospect Finder

Prospect Finder is a solo-use business prospecting tool for freelance web developers. It searches OpenStreetMap business data through the Overpass API, finds businesses with no website, and helps organize outreach in separate Prospect and Contacted lists.

## Tech Stack

- Frontend: React (Vite), Tailwind CSS, Axios, lucide-react
- Backend: Node.js, Express
- Storage: local `server/data.json`
- Data source: Overpass API

## Features

- Search by country: Tunisia, France, USA, UK, Germany
- Search by business type: Restaurant, Barber Shop, Cafe, Gym, Beauty Salon, Auto Repair
- Filters out businesses that already have a website in OSM
- Shows available phone, WhatsApp, email, address, Facebook, and Instagram details
- Move prospects into a Contacted list and restore them back when needed
- Saves both lists to `data.json` so data survives refresh and browser close

## Startup Instructions

### Option 1: Start Everything From The Project Root

1. `cd c:\projects\get_contacts`
2. `npm install`
3. `npm run install:all`
4. `npm run dev`

This starts:

- Backend on port `3001`
- Frontend on port `5173`

Open `http://localhost:5173` in your browser.

### Option 2: Start Manually In Two Terminals

1. `cd server && npm install && node index.js`
2. `cd client && npm install && npm run dev`

No environment variables or API keys are required.
