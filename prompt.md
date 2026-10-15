# Project Prompt History

This document collates all prompts used during the development of the **SG Bus Arrival & Real-Time Tracker** application.

---

## Prompt 1: Initial Frontend Architecture & Bus Tracking App

```text
build a Singapore based bus arrival time application that tracks real time bus locations and provides accurate wait time predications for all LTA bus stops

build just the front end for now, i will include the back end connection later.
```

**Actions Executed:**
- Designed and built the Singapore Bus Arrival & Real-Time Tracker web application.
- Implemented real-time arrival boards with countdown timers, LTA load crowding statuses (`SEA`, `SDA`, `LSD`), bus deck types (`SD`, `DD`, `BD`), and wheelchair accessibility (`WAB`).
- Integrated interactive Leaflet Singapore map with live moving buses, directional headings, speed (km/h), and plate numbers.
- Built bus route inspector modal, search by 5-digit bus stop code, MRT line interchange badges, and favorites system saved to `localStorage`.
- Included a high-fidelity simulation engine with Singapore road coordinates and dynamic physics.

---

## Prompt 2: GitHub Repository Push

```text
git push https://<GITHUB_ACCESS_TOKEN>@github.com/dudenuk3m/lta-bus-arrival.git
```
*(Note: Personal access token redacted for security and secret scanner protection)*

**Actions Executed:**
- Initialized local Git repository, configured branch to `main`.
- Staged and committed initial project codebase.
- Successfully pushed branch `main` to `https://github.com/dudenuk3m/lta-bus-arrival.git`.

---

## Prompt 3: Serverless Backend Connection for LTA DataMall v3

```text
add a serverless connection that pulls live data from LTA data mall using the following endpoints:

-store this in/api folder (prject root level) not the src folder
-include /health.ts and /busarrival.ts within that subfolder
-do not hardcode any key, i will include them later

GET https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=83139
# AccountKey: <LTA_ACCOUNT_KEY>
# accept: application/json
```

**Actions Executed:**
- Created `/api/health.ts` at root level for service uptime and LTA key configuration status.
- Created `/api/busarrival.ts` at root level querying `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival` with `AccountKey` and `accept: application/json` headers without hardcoded keys.
- Supported reading key dynamically from `process.env.LTA_ACCOUNT_KEY` or request headers, returning structured 401 guidance if unconfigured.
- Created `server.ts` mounting Express and `/api` serverless handlers.
- Updated `.env.example` with `LTA_ACCOUNT_KEY`.
- Verified and pushed changes to the GitHub repository.

---

## Prompt 4: Collate All Prompts

```text
collate all the prompts,
store as prompt.md
```

**Actions Executed:**
- Generated `prompt.md` documenting the complete prompt sequence, architectural milestones, and implementation history.
