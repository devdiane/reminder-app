# Event Reminder System

A full-stack reminder application built with Next.js, Prisma, PostgreSQL, and Telegram Bot integration. Never miss a deadline or meeting again!

## Features

### Core Features

- **Multi-user Support**: Each user has their own events and reminders
- **Telegram Reminders**: Get notified via Telegram bot
- **Scheduled Jobs**: Automated worker processes reminders at scheduled times
- **Smart Reminders**: 9 reminders per event (3 days, 24 hours, 3 hours, 1 hour, 15 min, at time, + missed alerts)
- **Event Types**: Deadline, Meeting, Business Trip

### Frontend Features

- Create events via web UI
- View upcoming events list
- Delete events
- Responsive design with clean UI

### Telegram Bot Features

- `/start` - Connect your Telegram account
- `/add TYPE | Title | YYYY-MM-DD HH:MM` - Create reminder
- `/events` - List your events
- `/help` - Show help

## Architecture

```
src/
├── app/                    # Next.js pages
│   ├── api/               # API routes
│   │   └── event/         # Event endpoints
│   └── page.tsx           # Homepage
├── bot/                    # Telegram bot
│   └── bot.ts
├── lib/                    # Utilities
│   ├── prisma.ts          # Prisma client
│   └── telegram.ts        # Bot instance
├── services/               # Business logic
│   ├── event.service.ts  # Event operations
│   ├── telegram.service.ts
│   └── jobQueue.service.ts
└── workers/                # Background workers
    └── job.worker.ts     # Job processor
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Bot**: node-telegram-bot-api
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/reminderdb"
TELEGRAM_BOT_TOKEN="your-bot-token-from-botfather"
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run the Application

Start the frontend:

```bash
npm run dev
```

Start the worker (in a separate terminal):

```bash
npx tsx src/workers/job.worker.ts
```

Start the bot (in a separate terminal):

```bash
npx tsx src/bot/bot.ts
```

## API Endpoints

### POST /api/event

Create a new event.

```json
{
  "title": "Project Submission",
  "type": "DEADLINE",
  "startTime": "2026-05-20T18:00:00",
  "userId": "123456789"
}
```

### GET /api/event/list

List all events.

### DELETE /api/event?id={eventId}

Delete an event.

## Telegram Bot Commands

### /start

Connect your Telegram account to receive reminders.

### /add

Create a new reminder. Format:
