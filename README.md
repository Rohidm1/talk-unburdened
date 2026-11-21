# Open Ear Collective

# Project Overview: Anontalk

Build a full-stack, responsive web application named **Anontalk** designed for male users in Belgium, the Netherlands, and the United States to connect anonymously via browser voice calls with dedicated listening representatives (staff).

The core proposition: A safe, judgment-free space for men to talk about daily stress, work, and relationships with a sympathetic listener. The staff are NOT therapists or psychologists—they provide a listening ear. 

---

## Technical Stack & Integrations

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion.

- **Backend/Database:** Supabase (Auth, Postgres DB, Row Level Security).

- **Voice Calling:** WebRTC peer-to-peer / Daily.co / Twilio WebRTC client integration.

- **Internationalization (i18n):** `react-i18next` for seamless toggle between Dutch (NL) and English (EN).

---

## User Roles & Authentication

1. **Client (Male Users):**

   - Sign up with Email + Alias (Pseudonym). No real names required.

   - Gets **3 free minutes** on their very first call.

   - Can purchase credits via credit system (€1.30/min or USD equivalent, plus discounted credit packages).

2. **Staff Member (Listener Profiles):**

   - Logging in opens the **Staff CRM Dashboard**.

   - Profile on the website represents a fictional female identity (avatar, bio, spoken languages, conversation topics).

   - Receives browser calls, manages real-time customer notes, tracks call hours.

3. **Admin (Owner):**

   - Full access to manage staff accounts, set profile avatars/bios, view call analytics, and monitor credit transactions.

---

## Database & Data Structure (Supabase)

- `profiles`: id, email, username (alias), role ('client' | 'staff' | 'admin'), credits_balance (numeric), free_minutes_used (boolean, default false), created_at.

- `listener_profiles`: id, staff_id (fk profiles), display_name, avatar_url, bio, languages (array), expertise_topics (array), status ('online' | 'busy' | 'offline').

- `calls`: id, client_id (fk profiles), listener_id (fk listener_profiles), duration_seconds, cost, status, created_at.

- `client_notes`: id, listener_id, client_id, note_text, logged_at (Ensures returning clients have their history visible to the staff member).

- `credit_packages`: id, name, price_eur, price_usd, credits_amount.

---

## Design System & Branding Guidelines

- **Vibe & Style:** Trustworthy, warm, masculine, premium, modern, 100% judgment-free. 

- **Colors:** Deep midnight blue, subtle dark slate, warm amber/gold accents (for trust and warmth). Dark mode focus.

- **Terminology Rule:** **STRICTLY NO MEDICAL OR PSYCHOLOGICAL TERMS** (Do NOT use: therapy, mental health, psychologist, treatment, clinic, diagnosis).

- **Tone of Voice:** Direct, supportive, approachable ("Take a load off", "Talk it out", "A listening ear when you need it").

---

## Page Inventory & Features

### 1. Header & Navigation

- Anontalk Logo

- Language Toggle (NL / EN flags)

- Navigation: Profiles, How It Works, Pricing, FAQ, Contact

- Auth Buttons: Login / Signup (or User Credit Balance Badge + Buy Credits button when logged in)

### 2. Homepage / Public View

- **Hero Section:** Catchy headline emphasizing anonymity, zero judgment, and rapid connection. CTA: "Start Your First 3 Free Minutes".

- **Trust Badges:** 100% Anonymous | No Credit Card Needed for Free Trial | Safe Browser Call.

- **Listener Profile Cards Grid:**

  - Displays avatar image, fictional display name, online status badge (Green = Available, Red = In Call, Gray = Offline).

  - Tags for Spoken Languages (e.g., NL, EN).

  - Tags for Favorite Topics (e.g., Work Stress, Relationship Advice, Unwinding).

  - Primary Action Button: **"Call Now"**.

- **Package & Pricing Section:**

  - Standard Pay-as-you-go rate (€1.30 / $1.30 per minute).

  - Discounted Credit Packages (e.g., Starter 15 min, Deep Talk 45 min, Value 90 min).

- **FAQ Component (Accordion):**

  - Explanations on anonymity, billing, how the free 3 minutes work, and clarifying that listeners are supportive peers, not therapists.

- **Contact Form Component:**

  - Input for Email, Subject, and Message for support/questions.

---

## Specific Call Routing & Availability Logic

1. **Direct Listener Calling:**

   - When a client clicks "Call Now" on a specific profile:

     - **If Listener is ONLINE:** Initiate WebRTC audio call popup in-browser. Start timer (First 3 mins free if new user, otherwise deduct from credit balance at €1.30/min).

     - **If Listener is OFFLINE / BUSY:** Show an overlay popup: *"This listener is currently unavailable. Would you like to talk to another available listener?"* with a quick-connect list of online profiles.

2. **Sticky Client Routing:**

   - Database matches returning client ID with previously called listener ID to recommend or prioritize their prior listener.

---

## Staff CRM Dashboard (`/staff-dashboard`)

- **Interface:** Clean internal workspace split into 2 main sections:

  1. **Active Call Screen:**

     - Live call timer & real-time credit deduction counter.

     - **Sticky Client Note History:** Auto-loads all past notes written about this specific calling client (identified by their Alias).

     - **Live Note Logger:** Text area to log important user context (e.g., "Works in logistics, stressed about upcoming project, prefers direct advice") saved directly to `client_notes`.

  2. **Performance Tab:**

     - Total hours/minutes spent on calls (Daily, Weekly, Monthly).

     - Total completed calls count.

  3. **Status Toggle:** Easy switch button between **Online** / **Offline**.

---

## Admin Panel (`/admin`)

- User management: Create new staff accounts and map them to synthetic female listener profiles.

- Manage pricing packages and manual credit overrides.

- Overview of platform call volume and total duration.

---

## Step-by-step Execution Plan for Lovable

1. Build responsive layouts, UI components (Tailwind + Shadcn UI), i18n language provider, and mock data for listener profiles.

2. Set up Supabase authentication (Client/Staff/Admin roles) and schema tables.

3. Build the In-Browser WebRTC Voice Call interface with timer logic (3 min free trial + credit balance deduction).

4. Implement the Staff CRM workspace with real-time note logging and client history retrieval.

5. Finalize public pages: Pricing, Contact Form, FAQ, and Trust-focused Masculine UI refinement.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://talk-unburdened.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4ade52c4-7d06-41dc-9617-883591d786a0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
