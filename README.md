Van Share

A lightweight coordination platform for shared private van transfers between popular tourist destinations in the Philippines.

Initial focus:

Puerto Princesa ↔ El Nido

The goal is NOT to build Uber or a real-time taxi platform. The goal is to help travelers:

create shared transfer journeys
join existing journeys
reduce private van costs
coordinate with operators/drivers
Core Product Idea

A traveler creates a planned transfer journey. Other travelers can browse and join compatible journeys. Van operators can view demand and offer to fulfill the journey.

Example:

El Nido → Puerto Princesa
Tomorrow
9am departure
2 passengers already
Looking for 2 more

Instead of paying ₱7000 privately, 4 travelers may each pay around ₱1750.

The product is fundamentally:

shared private transfers

NOT:

ride hailing
taxi dispatch
live driver tracking
dynamic routing optimization
Product Principles
Keep friction low

Most users are tourists using the platform once. Avoid forcing account creation before users can browse journeys.

Users should:

immediately see upcoming journeys
understand the concept within seconds
only provide details when joining or creating a journey
Preserve the “private van” feel

Too many pickups destroys the premium experience. The system should:

prefer limited detours
avoid excessive pickups
preserve predictable journeys
Journey-first architecture

The core object is NOT a user. The core object is a journey.

Users are temporary participants in a journey.

Recommended MVP
Public Landing Page

Immediately show:

explanation of the concept
upcoming journeys
estimated per-person pricing

Example cards:

Tomorrow • 9am
El Nido → Puerto Princesa
3 passengers
Estimated ₱1800/person

CTA:

Join Journey
Start Journey

No login required.

Journey Creation

Required fields:

Route
Date
Approx departure time
Pickup location
Dropoff location
Passenger count
Luggage count
Name
Email
WhatsApp/contact number

Optional:

Notes
Flexible timing
Joining Existing Journey

User sees:

current passengers
estimated price per person
pickup area
dropoff area
departure window

Then submits:

contact details
passenger count
pickup/dropoff
Operator Flow

Operators/drivers can:

browse journeys
see grouped demand
accept/claim journeys
contact passengers

Initially:

manual coordination is acceptable
no live dispatch required
no real-time GPS required
Suggested Architecture
Frontend
Next.js App Router
React
TailwindCSS
TypeScript
Backend
Supabase
PostgreSQL
Supabase Auth (optional initially)
Row Level Security later
Maps / Geocoding
OpenStreetMap
Nominatim
Leaflet

Avoid expensive map APIs initially.

Recommended Data Model
journeys

Represents a planned shared transfer.

Suggested fields:

id
route_id
departure_date
departure_time_window
host_name
host_email
host_phone
pickup_location
dropoff_location
passenger_count
luggage_count
status
created_at
journey_participants

Additional travelers joining a journey.

Suggested fields:

id
journey_id
name
email
phone
pickup_location
dropoff_location
passenger_count
luggage_count
status
created_at
operators

Van companies / drivers.

Suggested fields:

id
company_name
contact_name
phone
email
verified
created_at
operator_claims

Tracks operator interest in fulfilling journeys.

Suggested fields:

id
operator_id
journey_id
proposed_price
status
created_at
Recommended User Flow
Anonymous visitor
Opens homepage
Browses existing journeys
Either:
joins a journey
creates a journey
Enters contact details
Receives email confirmation

Avoid passwords initially.

Future Features (NOT MVP)

Do NOT build these early:

live driver tracking
real-time dispatch
complex routing algorithms
automatic fare splitting
in-app payments
chat systems
seat maps
Uber-style maps
full authentication systems

These dramatically increase complexity.

Monetization Ideas
Recommended Initial Model

Charge operators/drivers.

Examples:

pay per lead
monthly subscription
pay to unlock contact details

Avoid commissions and payment processing initially.

Design Goals

The app should feel:

lightweight
fast
simple
travel-oriented
trustworthy
low friction

It should NOT feel like:

enterprise software
logistics software
a taxi app
Current Technical State

Current stack already includes:

Next.js
Supabase
TailwindCSS
Leaflet
OpenStreetMap

Current UI state is minimal. Authentication pages are placeholders.

The project should now pivot toward:

public journey browsing
journey creation
journey joining
operator coordination

rather than passenger/driver dispatch architecture.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
