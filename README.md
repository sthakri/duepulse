# DuePulse

A Canvas-synced student assignment planner with AI-generated push notification nudges, D3 workload visualizations, and a Trigger.dev background job engine.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Background Jobs](#background-jobs)
- [API Endpoints](#api-endpoints)

## Features

### 📚 Real Canvas Data Integration
DuePulse pulls your actual assignments, due dates, and course load straight from Canvas LMS with no manual entry required. The application syncs with Canvas using the official API to fetch assignment data.

### 🧠 AI-Powered Nudges
The application learns when you actually sit down and focus, then builds a model of your productive windows over time to send personalized nudges exactly when you're likely to act. AI-generated nudges use NVIDIA NIM with the Mistral Large model to create friendly, personalized messages.

### 📊 Data Visualizations
Interactive D3.js charts help you visualize your workload patterns:
- Workload Heatmap: See your assignment density over time
- Productive Windows Chart: Identify your most focused hours of the day

### 🔔 Smart Push Notifications
DuePulse sends calm, intelligent notifications that respect your study patterns:
- No spam notifications
- AI-generated personalized messages
- Web Push API integration for cross-browser support
- Deduplication to prevent notification fatigue

### 📱 Progressive Web App
Full PWA support for offline functionality and mobile experience:
- Installable on mobile devices
- Works offline with cached data
- Background sync capabilities

## Tech Stack

- **Frontend**: Next.js 16.2.6, React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **AI**: NVIDIA NIM API with Mistral Large model
- **Data Visualization**: D3.js
- **Push Notifications**: web-push library
- **State Management**: Zustand
- **Background Jobs**: Trigger.dev
- **Rate Limiting**: Upstash Redis
- **Validation**: Zod with @t3-oss/env-nextjs

## Prerequisites

Before you begin, ensure you have the following accounts and API keys:

1. **Supabase Account** - For database and authentication
2. **NVIDIA NIM API Key** - For AI-generated nudges (free tier available)
3. **Upstash Account** - For Redis-based rate limiting
4. **Trigger.dev Account** - For background job scheduling
5. **Canvas LMS Account** - For assignment data (institution-specific)
6. **VAPID Keys** - For push notifications (generate with `npx web-push generate-vapid-keys`)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd duepulse
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory with all required environment variables (see [Environment Variables](#environment-variables) section).

### 4. Database Setup

1. Create a Supabase project
2. Run the schema from `supabase/schema.sql` in your Supabase SQL editor
3. Configure Row Level Security (RLS) as needed

### 5. Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:3000` to see the application.

## Environment Variables

DuePulse requires several environment variables to function properly. Create a `.env.local` file in the root directory with the following variables:

| Variable | Description | Where to Find |
|---------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications | Generate with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | VAPID private key | Generate with `npx web-push generate-vapid-keys` |
| `CANVAS_PERSONAL_TOKEN` | Canvas personal access token | Canvas LMS → Account → Settings → Approved Integrations |
| `CANVAS_DOMAIN` | Your institution's Canvas domain | e.g., `txstate.instructure.com` |
| `NIM_API_KEY` | NVIDIA NIM API key | [build.nvidia.com](https://build.nvidia.com) |
| `CRON_SECRET` | Secret for cron job authentication | Generate with `openssl rand -base64 32` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Upstash Dashboard → Database → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Upstash Dashboard → Database → REST API |
| `TRIGGER_SECRET_KEY` | Trigger.dev secret key | Trigger.dev Dashboard → Project → API Keys |
| `NUDGE_ENABLED` | Enable nudge engine | Set to "true" to enable |

## Development

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
npm run build
```

### Running in Production

```bash
npm run start
```

### Linting

```bash
npm run lint
```

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel Dashboard
3. Configure build settings:
   - Build Command: `next build --webpack`
   - Output Directory: `.next`

### Trigger.dev Background Jobs

After deploying to Vercel:

1. Install Trigger.dev CLI: `npm install -g @trigger.dev/cli`
2. Authenticate: `npx trigger.dev@latest login`
3. Deploy jobs: `npx trigger.dev@latest deploy`
4. Enable schedule in Trigger.dev dashboard
5. Set `NUDGE_ENABLED=true` in Vercel environment variables

### Testing Push Notifications

1. Complete onboarding in the deployed app
2. Click "Enable Notifications" and accept browser permission
3. Test with:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/push/test \
     -H "Content-Type: application/json" \
     -d '{"userId": "your-user-id"}'
   ```

## Architecture

### Core Components

1. **Frontend**: Next.js App Router with Server Components
2. **Authentication**: Supabase Auth with secure session management
3. **Data Layer**: Supabase client/server separation with RLS enforcement
4. **AI Engine**: NVIDIA NIM integration for personalized nudges
5. **Background Jobs**: Trigger.dev for scheduled nudge engine
6. **Data Visualization**: D3.js for interactive charts
7. **Push Notifications**: Web Push API with VAPID protocol
8. **Rate Limiting**: Upstash Redis for API protection

### Security

- All environment variables validated with Zod
- Supabase RLS enabled on all tables
- Rate limiting on all external API routes
- TypeScript strict mode enforcement
- No `any` types allowed

### Data Flow

1. User authenticates with Canvas LMS token
2. Assignment data syncs via background job (`/api/canvas/sync`)
3. Productive window tracking via visit data
4. AI nudge generation based on assignment deadlines
5. Push notification delivery via web-push
6. Background job scheduling via Trigger.dev

### Folder Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/             # API routes
│   ├── components/        # Page components
│   └── ui/             # shadcn/ui components
├── lib/                 # Business logic and utilities
├── trigger/             # Trigger.dev background jobs
└── database.types.ts      # Supabase type definitions
```

## Database Schema

The application uses a PostgreSQL database hosted on Supabase with the following tables:

### Profiles
User profile information including Canvas credentials and timezone settings.

### Courses
Course information synced from Canvas, including course names and colors.

### Assignments
Assignment data synced from Canvas, including due dates, points, and completion status.

### Push Subscriptions
Web Push API subscription data for sending notifications to user devices.

### Productive Windows
Tracking data for user productivity patterns, used for intelligent nudge timing.

### Nudge Logs
Deduplication log for sent push notifications to prevent notification fatigue.

## Background Jobs

### Nudge Engine
The nudge engine runs as a scheduled task on Trigger.dev with the following functionality:

1. **Productive Window Nudges**: Sent during user's identified productive hours
2. **Deadline Nudges**: Sent at specific intervals before assignment deadlines (12h, 6h, 1h)
3. **Deduplication**: Prevents duplicate notifications using nudge_logs table
4. **Timezone Awareness**: Respects user timezone for optimal notification timing

### Schedule
The nudge engine runs hourly (`0 * * * *`) and processes notifications based on:
- User productivity patterns
- Assignment deadlines
- Notification history

## API Endpoints

### Canvas Integration
- `POST /api/canvas/sync` - Sync assignments from Canvas
- `POST /api/canvas/test` - Test Canvas connection

### Push Notifications
- `POST /api/push/subscribe` - Register push notification subscription
- `POST /api/push/test` - Send test push notification

### Nudge Engine
- `GET /api/nudge/test` - Generate test nudge (development only)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
