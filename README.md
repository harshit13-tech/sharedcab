# SharedRide Bengaluru MVP

A self-service ride-matching web MVP.

## Current features
- Find matching demo rides
- Create a ride locally in the browser
- Basic route/fare preview
- Transparent MVP fare calculator
- Responsive mobile-friendly UI

## Important
This is the first prototype. It does NOT yet:
- store rides in a database
- authenticate users
- use live maps/routes
- process payments
- book Uber/Ola/Rapido
- provide production safety/verification

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Next production steps

1. PostgreSQL + Prisma
2. Authentication
3. Google Maps/Mapbox route matching
4. Real ride creation/search APIs
5. Chat/contact flow
6. Safety and reporting
7. Analytics
8. Vercel deployment
