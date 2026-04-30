import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Notion Projects database ID (from your workspace) ───────────────────────
const NOTION_DATABASE_ID = '34b8120c-9cff-8030-93d5-daa5ef84dfa8'

// ─── Map DRESIO status → Notion status ────────────────────────────────────────
// In progress if: any breakdown is checked, OR start date is today or earlier
// Done if: all breakdowns complete (100%), OR status field says done
function mapStatus(
  status: string,
  percent: number,
  checkedCount: number,
  startDate: string | null,
): string {
  const s = (status || '').toLowerCase().replace(/[_\s-]/g, '')

  if (percent === 100 || s === 'done' || s === 'complete' || s === 'completed') return 'Done'

  const startedWork = checkedCount > 0
  const startedByDate = !!startDate && new Date(startDate) <= new Date()

  if (s === 'inprogress' || s === 'active' || s === 'started' || startedWork || startedByDate) {
    return 'In progress'
  }

  return 'Not started'
}

// ─── Notion REST API helper ────────────────────────────────────────────────────
async function notion(method: string, path: string, body?: unknown) {
  const token = Deno.env.get('NOTION_TOKEN')
  if (!token) throw new Error('NOTION_TOKEN env var is not set')

  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Notion API error (${res.status}): ${JSON.stringify(data)}`)
  return data
}

// ─── Build the rich page body blocks ─────────────────────────────────────────
function buildBlocks(task: Record<string, unknown>): unknown[] {
  const blocks: unknown[] = []
  const breakdowns = ([...(task.breakdowns as unknown[] || [])] as Record<string, unknown>[])
    .sort((a, b) => (a.order_index as number) - (b.order_index as number))
  const reviews = (task.reviews as Record<string, unknown>[] || [])
  const assignments = (task.task_assignments as Record<string, unknown>[] || [])

  // ── Description ──
  if (task.description) {
    blocks.push({
      object: 'block', type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '📝' },
        rich_text: [{ type: 'text', text: { content: task.description } }],
        color: 'gray_background',
      },
    })
  }

  // ── Breakdown steps ──
  if (breakdowns.length > 0) {
    const checkedCount = breakdowns.filter(b => b.is_checked).length
    const total = breakdowns.length
    const pct = Math.round((checkedCount / total) * 100)

    blocks.push({ object: 'block', type: 'divider', divider: {} })
    blocks.push({
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: `📋  Breakdown Steps  (${checkedCount}/${total} · ${pct}%)` } }] },
    })

    for (const b of breakdowns) {
      const parts: unknown[] = [{ type: 'text', text: { content: b.title as string } }]

      // Show per-step dates inline if present
      if (b.start_date || b.end_date) {
        const dateStr = [b.start_date, b.end_date].filter(Boolean).join(' → ')
        parts.push({
          type: 'text',
          text: { content: `  ${dateStr}` },
          annotations: { color: 'gray', italic: true },
        })
      }

      blocks.push({
        object: 'block', type: 'to_do',
        to_do: { rich_text: parts, checked: !!b.is_checked },
      })
    }
  }

  // ── Assigned team members ──
  const names = assignments
    .map((a) => (a.profiles as Record<string, unknown>)?.full_name as string)
    .filter(Boolean)

  if (names.length > 0) {
    blocks.push({ object: 'block', type: 'divider', divider: {} })
    blocks.push({
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '👥  Assigned To' } }] },
    })
    blocks.push({
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: [{ type: 'text', text: { content: names.join('  ·  ') } }] },
    })
  }

  // ── Reviews ──
  if (reviews.length > 0) {
    blocks.push({ object: 'block', type: 'divider', divider: {} })
    blocks.push({
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '⭐  Reviews' } }] },
    })

    for (const r of reviews) {
      const score = r.score as number
      const emoji = score >= 8 ? '🟢' : score >= 5 ? '🟡' : '🔴'
      const text = `${score}/10${r.notes ? `  —  ${r.notes}` : ''}`
      blocks.push({
        object: 'block', type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji },
          rich_text: [{ type: 'text', text: { content: text } }],
          color: score >= 8 ? 'green_background' : score >= 5 ? 'yellow_background' : 'red_background',
        },
      })
    }
  }

  return blocks
}

// ─── Clear all children blocks from an existing Notion page ──────────────────
async function clearPageBlocks(pageId: string) {
  let cursor: string | undefined
  do {
    const res: Record<string, unknown> = await notion('GET', `/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ''}`)
    const results = res.results as Record<string, unknown>[]
    await Promise.all(results.map(b => notion('DELETE', `/blocks/${b.id as string}`)))
    cursor = res.has_more ? (res.next_cursor as string) : undefined
  } while (cursor)
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { task_id } = await req.json()
    if (!task_id) throw new Error('task_id is required')

    // ── Fetch the full task ──
    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        areas(name, color),
        breakdowns(*),
        reviews(*),
        task_assignments(*, profiles!task_assignments_user_id_fkey(id, full_name, role))
      `)
      .eq('id', task_id)
      .single()

    if (error || !task) throw new Error(error?.message || 'Task not found')

    // ── Compute progress ──
    const breakdowns = (task.breakdowns || []) as Record<string, unknown>[]
    const checkedCount = breakdowns.filter(b => b.is_checked).length
    const percent = breakdowns.length > 0 ? Math.round((checkedCount / breakdowns.length) * 100) : 0

    // ── Build Notion properties ──
    const properties: Record<string, unknown> = {
      'Project name': { title: [{ type: 'text', text: { content: task.title } }] },
      'Status': { status: { name: mapStatus(task.status || '', percent, checkedCount, task.start_date || null) } },
    }

    if (task.areas?.name) {
      properties['Team'] = { multi_select: [{ name: task.areas.name }] }
    }
    if (task.due_date) {
      properties['End date'] = { date: { start: task.due_date } }
    }
    if (task.start_date) {
      properties['Start date'] = { date: { start: task.start_date } }
    }
    // Use breakdown counts to drive the Notion Progress formula (start/end value)
    if (breakdowns.length > 0) {
      properties['Start value'] = { number: checkedCount }
      properties['End value'] = { number: breakdowns.length }
    }

    const blocks = buildBlocks(task)

    let notionPageId: string = task.notion_page_id || ''
    let notionUrl: string

    if (notionPageId) {
      // ── Update existing page ──
      await notion('PATCH', `/pages/${notionPageId}`, { properties })
      await clearPageBlocks(notionPageId)
      if (blocks.length > 0) {
        await notion('PATCH', `/blocks/${notionPageId}/children`, { children: blocks })
      }
      notionUrl = `https://notion.so/${notionPageId.replace(/-/g, '')}`
    } else {
      // ── Create new page ──
      const page = await notion('POST', '/pages', {
        parent: { database_id: NOTION_DATABASE_ID },
        properties,
        children: blocks,
      }) as Record<string, unknown>

      notionPageId = page.id as string
      notionUrl = page.url as string

      // Save notion_page_id back to Supabase so future saves update rather than duplicate
      await supabase.from('tasks').update({ notion_page_id: notionPageId }).eq('id', task_id)
    }

    return new Response(
      JSON.stringify({ notion_page_id: notionPageId, notion_url: notionUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[sync-to-notion]', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
