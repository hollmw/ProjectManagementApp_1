// ─────────────────────────────────────────────────────────────────────────────
// import-from-notion  — Supabase Edge Function
//
// Fetches all pages from your Notion Projects database and upserts them into
// the tasks / task_areas / breakdowns tables.
//
// Required secret (set in Supabase Dashboard → Settings → Edge Functions):
//   NOTION_TOKEN   — your Notion integration token (same one used by sync-to-notion)
//
// Required env (auto-provided by Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// POST body (JSON):
//   { "database_id": "34b8120c-9cff-8030-93d5-daa5ef84dfa8" }
//   (defaults to the DRESIO Projects database if omitted)
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTION_VERSION = '2022-06-28'
const DEFAULT_DB_ID  = '34b8120c-9cff-8030-93d5-daa5ef84dfa8'

// Map Notion Status → app status
const STATUS_MAP: Record<string, string> = {
  'Done':        'done',
  'In progress': 'in_progress',
  'Not started': 'todo',
}

// Map Notion Priority → app priority
const PRIORITY_MAP: Record<string, string> = {
  'High':   'high',
  'Medium': 'medium',
  'Low':    'low',
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Notion API helpers ────────────────────────────────────────────────────────

async function notionFetch(path: string, token: string, body?: object) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization':   `Bearer ${token}`,
      'Notion-Version':  NOTION_VERSION,
      'Content-Type':    'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion API error ${res.status}: ${err}`)
  }
  return res.json()
}

// Fetch all pages from a database (handles pagination)
async function fetchAllPages(databaseId: string, token: string) {
  const pages: any[] = []
  let cursor: string | undefined

  do {
    const body: any = { page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const data = await notionFetch(`/databases/${databaseId}/query`, token, body)
    pages.push(...data.results)
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  return pages
}

// Pull plain text out of a Notion rich_text / title array
function richText(arr: any[]): string {
  return (arr || []).map((b: any) => b.plain_text || '').join('')
}

// Parse checklist items from Notion page blocks
async function fetchBreakdowns(pageId: string, token: string) {
  const data = await notionFetch(`/blocks/${pageId}/children`, token)
  const steps: Array<{ title: string; is_checked: boolean; order_index: number }> = []

  let order = 0
  for (const block of data.results || []) {
    if (block.type === 'to_do') {
      steps.push({
        title:       richText(block.to_do.rich_text),
        is_checked:  block.to_do.checked,
        order_index: order++,
      })
    }
    // Also check heading-delimited sections for to_do blocks inside callouts etc.
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      steps.push({
        title:       richText(block[block.type].rich_text),
        is_checked:  false,
        order_index: order++,
      })
    }
  }
  return steps
}

// Get the description from the first callout block on the page
async function fetchDescription(pageId: string, token: string): Promise<string | null> {
  const data = await notionFetch(`/blocks/${pageId}/children`, token)
  for (const block of data.results || []) {
    if (block.type === 'callout') {
      const text = richText(block.callout.rich_text)
      if (text) return text
    }
  }
  return null
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const notionToken = Deno.env.get('NOTION_TOKEN')
    if (!notionToken) throw new Error('NOTION_TOKEN secret is not set')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const databaseId = body.database_id || DEFAULT_DB_ID

    // Fetch areas once to build a name → id lookup
    const { data: areasData } = await supabase.from('areas').select('id, name')
    const areaByName: Record<string, string> = {}
    for (const a of areasData || []) areaByName[a.name] = a.id

    // Fetch all Notion pages
    const pages = await fetchAllPages(databaseId, notionToken)

    const results = { imported: 0, skipped: 0, errors: [] as string[] }

    for (const page of pages) {
      const props = page.properties
      const title = richText(props['Project name']?.title || [])
      if (!title || title === 'New project') continue   // skip template

      const notionPageId = page.id.replace(/-/g, '')   // strip dashes
      const status   = STATUS_MAP[props['Status']?.status?.name]    || 'todo'
      const priority = PRIORITY_MAP[props['Priority']?.select?.name] || null
      const startDate = props['Start date']?.date?.start || null
      const dueDate   = props['End date']?.date?.start   || null
      const teamAreas: string[] = (props['Team']?.multi_select || []).map((o: any) => o.name)

      // Skip if already imported
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('notion_page_id', notionPageId)
        .maybeSingle()

      if (existing) {
        results.skipped++
        continue
      }

      // Fetch description + breakdowns from page content
      const [description, breakdowns] = await Promise.all([
        fetchDescription(page.id, notionToken),
        fetchBreakdowns(page.id, notionToken),
      ])

      const primaryAreaId = teamAreas.length > 0 ? areaByName[teamAreas[0]] : null

      // Insert task
      const { data: task, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          title:          title,
          status:         status,
          priority:       priority,
          start_date:     startDate,
          due_date:       dueDate,
          description:    description,
          notion_page_id: notionPageId,
          area_id:        primaryAreaId,
        })
        .select('id')
        .single()

      if (taskErr || !task) {
        results.errors.push(`${title}: ${taskErr?.message}`)
        continue
      }

      // Insert task_areas (multi-area support)
      for (const areaName of teamAreas) {
        const areaId = areaByName[areaName]
        if (areaId) {
          await supabase
            .from('task_areas')
            .insert({ task_id: task.id, area_id: areaId })
            .throwOnError()
        }
      }

      // Insert breakdowns
      if (breakdowns.length > 0) {
        await supabase
          .from('breakdowns')
          .insert(breakdowns.map(b => ({ ...b, task_id: task.id })))
          .throwOnError()
      }

      results.imported++
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
