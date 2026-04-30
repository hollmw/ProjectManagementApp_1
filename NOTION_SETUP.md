# Notion Integration Setup

This guide walks through the one-time setup required to activate Notion sync.

---

## 1 — Create a Notion Integration

1. Go to **https://www.notion.so/profile/integrations**
2. Click **New integration**
3. Name it **DRESIO Sync** (or anything you like)
4. Set capabilities: **Read content**, **Update content**, **Insert content**
5. Click **Save** — copy the **Internal Integration Secret** (starts with `ntn_` or `secret_`)

---

## 2 — Share your Projects database with the integration

1. Open the **Projects** database in Notion
2. Click the **···** menu (top-right) → **Connections**
3. Search for **DRESIO Sync** and click **Confirm**

> Without this step, the integration cannot read or write the database.

---

## 3 — Add the token to Supabase

Run this in your terminal (replace `<YOUR_TOKEN>` with the secret from step 1):

```bash
supabase secrets set NOTION_TOKEN=<YOUR_TOKEN>
```

Or set it in the Supabase dashboard: **Project Settings → Edge Functions → Secrets**

---

## 4 — Run the database migration

```bash
supabase db push
```

This adds the `notion_page_id` column to the `tasks` table so synced tasks are updated
rather than duplicated on future saves.

---

## 5 — Deploy the Edge Function

```bash
supabase functions deploy sync-to-notion
```

---

## How it works

| Action | What happens |
|--------|-------------|
| Create a task | Automatically synced to Notion Projects database |
| Edit a task | Notion page updated in place |
| Click the **N** icon on any card | Manually sync / open the Notion page |
| Three-dot menu → **Re-sync to Notion** | Force re-sync at any time |
| Three-dot menu → **View in Notion ↗** | Jump directly to the Notion page |

### Field mapping

| DRESIO field | Notion property |
|-------------|----------------|
| Title | Project name |
| Status + progress | Status (Not started / In progress / Done) |
| Area | Team (Tech / Business / Marketing / Science / Clinical / Design) |
| Start date | Start date |
| Due date | End date |
| Breakdown steps (count) | Start value / End value (drives the Progress formula) |
| Breakdown steps (detail) | To-do checklist inside the page |
| Reviews | Colour-coded callouts inside the page |
| Assignees | Listed inside the page |

---

## Troubleshooting

- **"NOTION_TOKEN env var is not set"** — run step 3 above and re-deploy
- **"Notion API error (403)"** — make sure you shared the database with the integration (step 2)
- **Sync button shows error on card** — open the browser console for the full error message
