# WorkSpace — DRESIO Project Management

Internal project management system for DRESIO's 6 business areas: Tech, Business, Marketing, Science, Clinical, and Design.

## What it does
- Task board with breakdown steps, progress tracking, and review scoring
- Role-based access: Admin, Member, Intern
- Real-time updates across all users
- Gamification: points, badges, leaderboard
- Gantt chart timeline view
- Activity log and user management

## Tech Stack
- Frontend: React + Vite, deployed on Vercel
- Database + Auth + Real-time: Supabase
- Admin operations: Supabase Edge Functions

## Running locally

### Prerequisites
- Node.js 20+
- A Supabase project

### Frontend
```bash
cd client
npm install
npm run dev
```

### Environment variables

Create `client/.env`:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

## Database schema

### Tables
- `profiles` — user profiles linked to auth.users (id, full_name, role, points, email)
- `areas` — 6 business areas with colours
- `user_areas` — many-to-many: users to areas
- `tasks` — tasks with title, description, area, due date, status
- `breakdowns` — checklist steps inside each task
- `task_assignments` — which users are assigned to which tasks
- `reviews` — 1-10 score + notes per task
- `badges` — earned badges per user
- `activity_log` — audit trail of all user actions

### Roles
- `admin` — full access, manages users and tasks
- `member` — can view all tasks, check breakdowns, add reviews
- `intern` — only sees assigned tasks

## Edge Functions
- `create-user` — creates Supabase auth user + profile + area assignments
- `delete-user` — deletes user from auth + profile

## Deployment
- Frontend deployed on Vercel (root directory: `client`)
- Edge Functions deployed via Supabase CLI: `supabase functions deploy`