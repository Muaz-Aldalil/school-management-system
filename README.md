# School Management System

Built this for Al-Amiriya School in Sudan. It handles students, grades, payments, and a public landing page — all in Arabic and English.

Live at: [al-amriya.netlify.app](https://al-amriya.netlify.app)

## What it does

Basically everything a school principle needs day-to-day. You can track students across classes, manage grades per subject per term, generate report cards, handle payments and invoices, and run ministry reports. There's a registration system where parents can apply online and admins approve or reject them.

The landing page is fully editable from the admin panel — hero section, about, programs, events, achievements, teachers, contact info. You toggle sections on/off and fill in Arabic and English separately.

It also works offline. The app stores everything in IndexedDB and syncs to Supabase when the connection comes back. Useful for areas with spotty internet. You can install it on a phone like a native app (PWA).

WhatsApp integration is there too, but it needs a Business API account to actually send messages.

## Tech

- React 19 + Vite 6 + Tailwind CSS 4
- Supabase for everything backend (auth, database, storage, realtime, edge functions)
- Netlify for hosting
- PWA with service worker

## Getting it running

You'll need Node 18+ and a Supabase account.

```bash
git clone <repo-url>
cd "Schoole Mangement System"
npm install
cp .env.example .env
```

Then fill in `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Set up the database — go to your Supabase dashboard, open the SQL editor, and run every `.sql` file in the `supabase/` folder in order. There are 15 of them. Don't skip any. The order matters because later migrations depend on earlier ones.

Once the database is set up:

```bash
npm run generate-icons   # creates PWA icons from the SVG favicon
npm run dev              # starts the dev server on localhost:5173
```

The first person to sign up needs to be manually promoted to admin. After they complete the onboarding wizard, they can invite other users (teachers, supervisors, accountants) from the admin panel.

## Scripts

| Command                  | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `npm run dev`            | Dev server with hot reload                          |
| `npm run build`          | Production build (adds build version + SW manifest) |
| `npm run preview`        | Preview the production build locally                |
| `npm run lint`           | ESLint check (0 warnings allowed)                   |
| `npm run lint:fix`       | ESLint with auto-fix                                |
| `npm run test`           | Run tests in watch mode                             |
| `npm run test:run`       | Run tests once                                      |
| `npm run test:coverage`  | Run tests with coverage report                      |
| `npm run generate-icons` | Regenerate PWA icons from favicon.svg               |

## Project structure

```
src/
  components/        # UI components
    landing/         # Public landing page sections (Hero, About, Events, etc.)
    reports/         # Ministry report forms
  context/           # React context providers
    AuthContext.jsx   # Login, signup, session management
    SchoolContext.jsx # Students, grades, payments, notifications
    LandingContext.jsx# Landing page content management
    LanguageContext.jsx # Arabic/English switching
  i18n/
    translations.js  # All UI strings in both languages
  lib/
    supabase.js      # Supabase client setup
    offline-db.js    # IndexedDB for offline mode
    sync-engine.js   # Background sync logic
    utils.js         # Formatting helpers (dates, scores, etc.)
  pages/             # Route components
    admin/           # Admin-only pages (Users, CMS, Registrations, Reports)
  test/              # Vitest tests
supabase/
  functions/         # Edge Functions (WhatsApp integration)
  *.sql              # Database migrations (run in order!)
```

## User roles

- **Admin** — full access to everything
- **Supervisor** — can manage students and grades
- **Teacher** — can view and edit their assigned students
- **Accountant** — handles payments only
- **ParentAndStu** — sees their child's dashboard (grades, payments, attendance)

## Offline mode

The app uses IndexedDB to store data locally. When you make changes offline, they go into an outbox. Next time the device connects, everything syncs automatically. There's a sync status indicator in the top bar.

What works offline: viewing/adding students, grades, payments, report cards.
What doesn't: user management, landing page edits, WhatsApp messages (need server).

## Known stuff

- ESLint has a bunch of warnings from unused imports — they're harmless and most are from components that get lazy-loaded
- Tests cover the utility functions only, no end-to-end tests yet
- The WhatsApp integration needs a paid Business API account (~$5/month)
- Some tables don't have RLS policies — security is handled by client-side role checks and server-side RPC validation

## License

Private. Built for Al-Amiriya School.

---

Built by Muaz Aldalil
muazaldalil@gmail.com | +249904293228 | [linkedin.com/in/muaz-aldalil](https://linkedin.com/in/muaz-aldalil)
