# Echelon — Personal Productivity XP Tracking Web App

Echelon is a minimalist, modern web application for personal productivity tracking. It empowers users to define custom activities, configure granular experience points (XP) rules, run persistent focused timers or manual logs, analyze trends across categories, view monthly activity heatmaps, and maintain learning reflection journals.

Designed with a calm, restrained aesthetic that feels like a professional productivity tool rather than a toy or game.

---

## Features

1. **Custom Activities & Granular XP Rules**
   - Create, edit, archive, restore, and delete activities.
   - **Time-based scoring**: XP per hour or per minute (e.g. 2 XP/hr or 0.1 XP/min). XP is earned proportionally to actual recorded duration.
   - **Quantity-based scoring**: XP per completed item (e.g. 4 XP per solved problem).
   - Validation against negative rates and invalid numbers.
   - Default editable categories: *Study*, *Coding*, *Health*, *Personal Development*, with support for custom categories and color codes.

2. **Persistent Work Sessions & Digital Stopwatch**
   - Active timer with start, pause, resume, finish, and discard actions.
   - Live XP calculation counter updating dynamically every second.
   - Paused time never counts toward productive duration.
   - Overlap prevention (enforces one active timer at a time).
   - Restores timer state after browser refreshes or device restarts using timestamp comparisons.
   - Historical integrity: sessions snapshot their applied rate and activity details so editing a task's rate never alters past records.
   - Editing past sessions recalculates XP automatically using saved rates.

3. **Productivity Dashboard**
   - Real-time answers to *"How productive have I been?"*
   - XP earned today, XP earned this week, lifetime XP, and productive time today.
   - 7-Day daily XP interactive bar chart.
   - Quick Start Timer action and Quick Work Logger right from the dashboard.
   - Recent session history table with inline edit and delete actions.

4. **Deep Analytics & Insights**
   - Daily, weekly, and monthly aggregate totals.
   - Chronological XP and productive time trends.
   - Category distribution pie chart with custom swatches.
   - Top productive activities ranking by total XP and session counts.
   - Average daily XP velocity and Peak productive day indicator.
   - Filterable session history by date range (7d, 30d, 90d, All Time), category, and task.

5. **Monthly Heatmap Calendar**
   - Interactive calendar grid with intensity indicators scaling by daily XP.
   - Month-to-month navigation with single-click return to "Today".
   - Selected date drawer showing that day's total XP, focused time, and chronological session logs.
   - Consistent local timezone handling.

6. **Clean Minimalist Design & Dual Mode**
   - Neutral backgrounds (`zinc`/`slate`), subtle borders, and high contrast typography.
   - Dark mode default with full light mode toggle.
   - Compact desktop sidebar and responsive mobile drawer navigation.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Charts & Data Visualization**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security) + seamless local persistence fallback.

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher recommended, tested on Node v25.5.0)
- npm, pnpm, or yarn

### 1. Installation

Clone or enter the project directory and install dependencies:

```bash
cd Echelon
npm install
```

### 2. Run the Development Server

You can immediately run the application:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note**: Echelon includes an automatic local storage fallback with sample baseline data. You can test all features (timer, manual logs, charts, calendar, task management) immediately out of the box without configuring Supabase first!

---

## Supabase Configuration & Database Setup

To persist data to your own cloud PostgreSQL database and enable user authentication:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the Supabase Dashboard, navigate to **SQL Editor**.
3. Open `supabase/schema.sql` from this repository, copy its contents, and execute the SQL script.

This creates:
- `public.profiles`
- `public.categories`
- `public.tasks`
- `public.work_sessions`
- `public.active_timers`
- Row Level Security (RLS) policies guaranteeing each user's data is strictly private (`auth.uid() = user_id`).
- Automatic trigger (`handle_new_user`) that provisions default categories (*Study*, *Coding*, *Health*, *Personal Development*) on user signup.

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in your project credentials from **Project Settings -> API**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Restart your Next.js server (`npm run dev`). Echelon will automatically detect the configuration and connect to Supabase!

---

## Running Automated Tests

Run the XP calculation and timer validation suite:

```bash
node tests/verify.mjs
```

Runs 16 verification checks covering proportional time calculation, quantity calculation, minute-based rates, non-negative bounds, decimal formatting, duration formatters, and digital clock displays.

---

## Production Build & Deployment

To create an optimized production build:

```bash
npm run build
npm run start
```

### Deploying to Vercel

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. In Project Settings, add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.
