import { describe, expect, it } from 'vitest'
import type { SitePlanTask } from '@/types/siteplan'
import {
  applyReorderMoves,
  getAncestorIds,
  normalizeSiblingSortOrders,
  wouldCreateHierarchyCycle,
} from '@/lib/siteplanTree'

function task(overrides: Partial<SitePlanTask> & Pick<SitePlanTask, 'id' | 'project_id' | 'name'>): SitePlanTask {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: overrides.id,
    project_id: overrides.project_id,
    parent_id: overrides.parent_id ?? null,
    wbs_code: overrides.wbs_code ?? overrides.id,
    name: overrides.name,
    type: overrides.type ?? 'task',
    status: overrides.status ?? 'not_started',
    start_date: overrides.start_date ?? '2026-01-01',
    end_date: overrides.end_date ?? '2026-01-02',
    actual_start: overrides.actual_start ?? null,
    actual_end: overrides.actual_end ?? null,
    progress: overrides.progress ?? 0,
    duration_days: overrides.duration_days ?? 1,
    predecessors: overrides.predecessors ?? null,
    responsible: overrides.responsible ?? null,
    assigned_to: overrides.assigned_to ?? null,
    comments: overrides.comments ?? null,
    notes: overrides.notes ?? null,
    sort_order: overrides.sort_order ?? 1,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    updated_by: overrides.updated_by ?? null,
  }
}

describe('siteplanTree helpers', () => {
  it('returns ancestor chain from nearest parent upward', () => {
    const tasks = [
      task({ id: 'root', project_id: 'p1', name: 'Root', parent_id: null }),
      task({ id: 'child', project_id: 'p1', name: 'Child', parent_id: 'root' }),
      task({ id: 'leaf', project_id: 'p1', name: 'Leaf', parent_id: 'child' }),
    ]

    expect(getAncestorIds(tasks, 'leaf')).toEqual(['child', 'root'])
  })

  it('detects hierarchy cycles when moving under descendants', () => {
    const tasks = [
      task({ id: 'a', project_id: 'p1', name: 'A', parent_id: null }),
      task({ id: 'b', project_id: 'p1', name: 'B', parent_id: 'a' }),
      task({ id: 'c', project_id: 'p1', name: 'C', parent_id: 'b' }),
    ]

    expect(wouldCreateHierarchyCycle(tasks, 'a', 'c')).toBe(true)
    expect(wouldCreateHierarchyCycle(tasks, 'b', 'a')).toBe(false)
  })

  it('normalizes sibling sort order gaps after projected moves', () => {
    const tasks = [
      task({ id: 'r1', project_id: 'p1', name: 'R1', parent_id: null, sort_order: 10 }),
      task({ id: 'r2', project_id: 'p1', name: 'R2', parent_id: null, sort_order: 20 }),
      task({ id: 'c1', project_id: 'p1', name: 'C1', parent_id: 'r1', sort_order: 4 }),
      task({ id: 'c2', project_id: 'p1', name: 'C2', parent_id: 'r1', sort_order: 9 }),
    ]

    const projected = applyReorderMoves(tasks, [
      { id: 'c2', parent_id: 'r1', sort_order: 1 },
    ])

    const normalized = normalizeSiblingSortOrders(projected)

    expect(normalized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'r1', parent_id: null, sort_order: 1 }),
        expect.objectContaining({ id: 'r2', parent_id: null, sort_order: 2 }),
        expect.objectContaining({ id: 'c2', parent_id: 'r1', sort_order: 1 }),
        expect.objectContaining({ id: 'c1', parent_id: 'r1', sort_order: 2 }),
      ])
    )
  })
})
