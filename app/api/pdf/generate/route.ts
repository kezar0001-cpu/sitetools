import { renderToBuffer } from '@react-pdf/renderer'
import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { MSADocument } from '@/lib/pdf/msaTemplate'
import type { MSADocumentProps } from '@/lib/pdf/types'

const REQUIRED_FIELDS: Array<keyof MSADocumentProps> = [
  'documentType',
  'documentNo',
  'date',
  'revision',
  'title',
  'project',
  'client',
  'preparedBy',
  'sections',
]

function validatePayload(body: Partial<MSADocumentProps>): string[] {
  const missing: string[] = []

  for (const field of REQUIRED_FIELDS) {
    const value = body[field]
    if (value === undefined || value === null || value === '') {
      missing.push(field)
    }
  }

  if (body.sections && !Array.isArray(body.sections)) {
    missing.push('sections (must be array)')
  }

  return missing
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<MSADocumentProps>
    const missing = validatePayload(body)

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing or invalid required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const data = body as MSADocumentProps
    const buffer = await renderToBuffer(createElement(MSADocument, data))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${data.documentNo}.pdf"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload or PDF generation failed' }, { status: 400 })
  }
}

/*
Example test payload (MSADocumentProps):
{
  "documentType": "Site Inspection Report",
  "documentNo": "MSA-SIR-2026-001",
  "date": "09 April 2026",
  "revision": "Rev A",
  "title": "Civil Site Inspection — Stage 1",
  "subtitle": "Reference: INS-042",
  "project": "North Precinct Utilities Upgrade",
  "client": "City Infrastructure Group",
  "preparedBy": "Alex Taylor",
  "sections": [
    {
      "title": "Inspection Summary",
      "items": [
        { "type": "paragraph", "text": "Inspection completed for trenching, conduit layout, and reinstatement quality checks." },
        {
          "type": "fields",
          "data": [
            { "label": "Inspector", "value": "Alex Taylor" },
            { "label": "Weather", "value": "Fine, 22°C" },
            { "label": "Permit", "value": "P-88219" },
            { "label": "Site Supervisor", "value": "J. Nguyen" },
            { "label": "Start Time", "value": "07:30" },
            { "label": "End Time", "value": "15:45" },
            { "label": "Crew", "value": "8" },
            { "label": "Safety Incidents", "value": "0" }
          ]
        }
      ]
    },
    {
      "title": "Defects and Actions",
      "items": [
        {
          "type": "status_table",
          "columns": [
            { "header": "Item", "weight": 2 },
            { "header": "Location", "weight": 1 },
            { "header": "Owner", "weight": 1 },
            { "header": "Status", "weight": 1 }
          ],
          "rows": [
            { "cells": ["Backfill compaction", "Chainage 240", "Civil Crew", ""], "status": "open" },
            { "cells": ["Pit lid alignment", "Pit 14", "Supervisor", ""], "status": "critical" },
            { "cells": ["Marker tape placement", "Segment B", "Install Team", ""], "status": "closed" },
            { "cells": ["As-built markups", "Office", "Drafting", ""], "status": "open" },
            { "cells": ["Traffic controls", "South Entry", "Traffic Mgmt", ""], "status": "closed" }
          ]
        },
        { "type": "action", "text": "Rectify pit lid alignment before practical completion inspection." },
        { "type": "warning", "text": "Rain forecast may delay reinstatement works planned for Friday." }
      ]
    }
  ]
}
*/
