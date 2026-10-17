# HackSphere — Where Ideas Become Innovation

A full-stack, role-based hackathon management platform. Participants discover events, form teams, pick a challenge and submit their build. Organizers configure and run the whole event. Judges score projects against a weighted rubric. Administrators verify organizers, moderate accounts and review an audit trail.

The interface is **light-first**: a bright canvas, bento-grid dashboards, glass navigation, clay tiles and avatars, and neumorphic toggles. Dark mode exists as an optional, reduced theme (profile menu or Profile → Appearance).

---

## 1. Requirements

| Tool | Version |
| --- | --- |
| Node.js | **20.19 or newer** (22 LTS recommended) |
| npm | 10+ |
| OS | Windows, macOS or Linux |

No database server is needed. SQLite is a file (`server/dev.db`) created for you.

---

## 2. Quick start

Open **two terminals** in the project folder.

**Terminal 1: API server**

```bash
cd server
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
npm run setup               # generates Prisma client, creates dev.db, loads demo data
npm run dev                 # http://localhost:4000
```

**Terminal 2: web app**

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

Open **http://localhost:5173**. The dev server proxies `/api` and `/socket.io` to port 4000, so cookies and live updates work without extra configuration.

### Demo accounts

Every account uses the password **`HackSphere@123`**. On the sign-in page (in development) you can click an account to fill it in.

| Role | Email | What to try |
| --- | --- | --- |
| Participant | `student@hacksphere.dev` | Accept Ananya's invitation to *Null Pointers* |
| Team leader | `leader@hacksphere.dev` | Register *Null Pointers*, choose a challenge, invite members |
| Organizer | `organizer@hacksphere.dev` | Approve registrations, assign judges, publish *HealthHack* results |
| Judge | `judge@hacksphere.dev` | Score *DoseBuddy* and *ClinicFlow* in HealthHack Sprint |
| Admin | `admin@hacksphere.dev` | Verify the *Tech Club VVCE* organizer, review the audit log |
| Unverified organizer | `techclub@hacksphere.dev` | See the verification-pending state |

The seed creates one hackathon at every stage: *Campus Build Night* (announced), *CodeVerse 2026* (registration open), *GreenGrid* (live), *HealthHack Sprint* (judging), *FinTech Forge* (completed, results published) and *AI for Bharat* (private draft).

To start over at any time: `cd server && npm run db:reset`.

---

## 3. Scripts

**server/**

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with auto-reload |
| `npm start` | API without reload |
| `npm run setup` | Generate Prisma client, create tables, seed |
| `npm run db:reset` | Wipe the database and re-seed |
| `npm run db:seed` | Re-seed only |
| `npm test` | Unit tests (scoring, ranking, tie-breaks) |
| `npm run smoke` | 67 end-to-end API checks across all roles (needs a fresh seed and the server running) |
| `npm run typecheck` | TypeScript check |

**client/**

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck and production build to `client/dist` |
| `npm test` | Component tests (Vitest + Testing Library) |
| `npm run e2e` | Playwright tests, desktop and mobile (run `npx playwright install chromium` once first) |

The root `package.json` has shortcuts: `npm run install:all`, `npm run setup`, `npm run dev:server`, `npm run dev:client`, `npm test`.

---

## 4. Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 with custom design tokens |
| Components | Radix UI primitives (dialog, tabs, dropdown) in a shadcn-style local kit (`client/src/components/ui.tsx`) |
| Animation | Motion for React (`motion/react`), respects reduced-motion |
| 3D | React Three Fiber + Drei (landing hero only, lazy-loaded) |
| Charts | Recharts |
| Data | TanStack Query, React Router 7 |
| Backend | Node.js, Express, Zod validation |
| Database | SQLite via Prisma 7 (better-sqlite3 driver adapter) |
| Auth | Server-managed sessions (httpOnly cookie, SHA-256 token hash in DB), Argon2id passwords |
| Real time | Socket.IO (per-user and per-event rooms) |
| Uploads | Multer (15 MB limit, type allow-list, access-controlled downloads) |
| Testing | Vitest, Testing Library, Playwright |

> **Prisma 7 note.** Prisma 7 needs `prisma.config.ts` (included) and generates the client into `server/src/generated/prisma`. `npm run setup` does this; re-run `npm run db:generate` after editing `schema.prisma`.

---

## 5. Project structure

```
hacksphere/
├── server/
│   ├── prisma/schema.prisma      15 entities + sessions/reset tokens
│   ├── prisma/seed.ts            demo data for every stage and role
│   ├── src/
│   │   ├── index.ts              HTTP + Socket.IO bootstrap
│   │   ├── app.ts                Express app, routes, static client (prod)
│   │   ├── middleware/auth.ts    sessions, requireAuth, requireRole
│   │   ├── lib/                  access rules, scoring, results, notifications, uploads
│   │   └── routes/               auth, events, manage, teams, judging, notifications, dashboard, admin
│   └── tests/                    scoring unit tests, API smoke test
└── client/
    ├── src/
    │   ├── index.css             design tokens: palette, glass, clay, neumorphic
    │   ├── components/           UI kit, Dialog, Tabs, Toast, Countdown, Confetti, Hero3D, EventCard
    │   ├── layouts/              public layout, app shell with role-aware sidebar
    │   ├── auth/                 session context
    │   ├── lib/                  API client, types, formatting, real-time hooks
    │   └── pages/                public, auth, app (participant/leader), organize, judge, admin
    └── e2e/                      Playwright specs
```

---

## 6. Roles and permissions

One identity, several contexts. Every permission is enforced on the server; the UI only hides what a user can't use.

| Role | How you get it | Can do |
| --- | --- | --- |
| Visitor | Not signed in | Browse published hackathons, schedules, rules, results |
| Participant | Default account | Create or join one team per hackathon, accept invitations, request to join teams, save hackathons |
| Team leader | Creating a team (or receiving leadership) | Invite, approve requests, remove members, transfer leadership, choose the challenge, register, submit |
| Organizer | Organizer account verified by an admin, or added as co-organizer | Create events, move stages, manage challenges and rubric, review registrations, grant extensions, assign judges, announce, publish results |
| Judge | Added to a specific hackathon by its organizer | Score assigned final submissions, write feedback, declare conflicts of interest |
| Admin | Platform role | Change roles, suspend accounts (ends their sessions), verify organizers, moderate events, read the audit log |

Key rules the server enforces:

- A person can be on only one team per hackathon (database unique constraint), and judges of a hackathon can't join a team in it.
- Team size limits apply to invitations, joins and registration.
- Problem statements can have a team limit; the challenge locks after a final submission.
- Submissions need an approved registration and a live hackathon, and lock at the deadline unless the organizer grants that team an extension.
- Final submissions require a challenge, a 50+ character summary, a repository link and a demo or video link.
- The rubric locks once any judge starts scoring, so scores stay comparable.
- Judges can't score their own team; a conflict declaration removes their draft and notifies organizers.
- Rankings stay private until the organizer publishes them.

### Scoring

Each judge rates every criterion from 0 to 10. A judge's score is the weighted average

S = Σ(wᵢ · rᵢ) / Σ(wᵢ)

and a team's final score is the mean of its submitted evaluations. Ties go to the earlier final submission; complete ties share a rank. Teams without evaluations are listed but unranked, and missing evaluations are shown to organizers. Awards are generated for the top three and the best project in each challenge.

---

## 7. Design system

| Token | Value | Used for |
| --- | --- | --- |
| Primary violet | `#7058F5` (`#5A41E6` for buttons, for contrast) | Brand, primary actions, focus rings |
| Electric blue | `#4285FF` | "Live now" stage, charts |
| Coral | `#FF7890` | "Judging" stage, alerts, unread badges |
| Sunny yellow | `#FFC857` | "Announced" stage, highlights, warnings |
| Mint | `#3DCFAE` | "Registration open" stage, success, progress |
| Canvas white | `#F8FAFF` | Page background |
| Text navy | `#202747` | Body text |

- **Type:** Bricolage Grotesque for headings, Figtree for body (bundled, so the app works offline).
- **Bento grid:** dashboards and the command center.
- **Glassmorphism:** sidebar, top bar, overlays, featured cards.
- **Claymorphism:** stat tiles, avatars, podium, empty-state icons, the 3D hero.
- **Neumorphism:** toggles, pressed buttons, active nav indicator only.
- **Stage colours** are identical everywhere (badges, stepper, charts).
- **Motion:** one orchestrated reveal per screen, spring dialogs, sliding nav indicator, confetti only for registration and final submission. All motion respects `prefers-reduced-motion`.
- **Accessibility:** visible focus rings, skip links, labelled controls with linked error messages, keyboard-operable switches, text colour picked automatically for WCAG contrast on coloured surfaces.

---

## 8. Production and deployment

**Single host (simplest).** Build the client and let the API serve it:

```bash
cd client && npm run build
cd ../server && NODE_ENV=production npm start      # serves the app and API on :4000
```

Everything is on one origin, so session cookies work with the default `COOKIE_SAMESITE=lax`. Put it behind HTTPS (cookies are `Secure` in production).

**Split hosting (Vercel or Netlify frontend + a persistent Node host).**
Use a host with a persistent disk for `dev.db` and `uploads/` (Render, Railway, Fly.io or a VPS; not serverless functions).

- Easiest: add a rewrite on the frontend host so `/api/*` and `/socket.io/*` proxy to your API. The browser then sees one site and cookies just work.
- Without a rewrite: set `VITE_API_URL=https://api.example.com` when building the client, and on the server set `CLIENT_ORIGIN=https://your-frontend.app` and `COOKIE_SAMESITE=none` (requires HTTPS).

SQLite suits a classroom deployment and moderate single-server load. For multiple servers, switch the Prisma datasource to PostgreSQL.

---

## 9. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Can't reach the HackSphere server" | Start the API (`cd server && npm run dev`) before using the app |
| `npm install` fails building `better-sqlite3` or `argon2` | Use Node 20.19+ or 22 LTS, which have prebuilt binaries. On Windows, re-run the install from a fresh terminal |
| `Cannot find module '../generated/prisma/client'` | Run `npm run db:generate` in `server/` |
| Port 4000 or 5173 in use | Change `PORT` in `server/.env`; for the client run `npx vite --port 5174` and set `CLIENT_ORIGIN` to match |
| Password reset email never arrives | There is no mail server in the prototype. The reset link is printed in the API terminal and shown on screen in development |
| 3D shapes on the landing page don't appear | The hero needs WebGL; everything else works without it. Slower machines may take a few seconds in dev mode |
| Want a clean slate | `cd server && npm run db:reset` |
