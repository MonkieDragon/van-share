<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

Purpose

This file explains the intended product direction and engineering philosophy for AI coding agents working on the project.

The project is a lightweight shared private transfer coordination platform.

It is NOT an Uber clone.

Core Product Philosophy

The app coordinates shared private van journeys between tourist destinations.

Primary initial route:

Puerto Princesa ↔ El Nido

The platform should:

aggregate traveler demand
help travelers share private vans
help operators discover grouped demand

The platform should NOT attempt to:

dispatch drivers in real time
optimize routes automatically
recreate ride-hailing apps
Critical UX Principles

1. Browsing should be public

Users should immediately see journeys. Avoid login walls.

Do NOT require signup before browsing.

2. Keep friction extremely low

Most users are tourists using the platform once.

Avoid:

passwords
onboarding flows
profile systems
account setup

Prefer:

email links
lightweight participation
guest flows 

3. Preserve premium transfer experience

The app exists because private vans are better than shared vans.

Avoid product decisions that recreate:

slow hotel-hopping
excessive pickups
unpredictable timing

Limit detours and complexity.

4. Human coordination is acceptable

Do not over-automate early.

Drivers/operators already understand:

traffic
routes
realistic pickup logic

Allow operators to manually decide whether journeys are practical.

Architecture Guidance
Prefer simple systems

Avoid premature complexity.

Prefer:

straightforward CRUD
simple status systems
server actions/API routes
Supabase queries

Avoid:

websocket systems
event buses
background job systems
microservices
realtime tracking
Frontend Guidance

Use:

App Router
TypeScript
Tailwind
server components where appropriate

Keep UI:

mobile-first
simple
readable
high contrast

Avoid pale text on pale backgrounds.

Map Guidance

Maps are secondary.

The platform is primarily:

a coordination board
not a live transport tracker

Do not build complicated map systems early.

Simple pickup visualization is sufficient.

Data Model Guidance

The core entity is:

journey

NOT:

users
rides
bookings

Users are temporary participants.

Avoid overbuilding account systems.

MVP Priorities

Prefer:

consistency
stable structure
reusable components
simple naming

Avoid repeatedly renaming folders/components.

Maintain stable project structure.


Development Philosophy

Optimize for:

speed of iteration
clarity
understandable UX
low operational complexity

Do not optimize prematurely.
