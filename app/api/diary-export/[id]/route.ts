import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * Generate a PDF from diary data
 * POST /api/diary-export/[id]?format=pdf
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { id } = params;
  const format = req.nextUrl.searchParams.get("format") || "pdf";

  // Authenticate
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  // Fetch diary with related data
  const { data: diary, error: diaryError } = await supabaseAdmin
    .from("site_diaries")
    .select(`
      *,
      project:project_id(name),
      site:site_id(name),
      labor:site_diary_labor(*),
      equipment:site_diary_equipment(*),
      issues:site_diary_issues(*),
      photos:site_diary_photos(*)
    `)
    .eq("id", id)
    .single();

  if (diaryError || !diary) {
    return NextResponse.json({ error: "Diary not found." }, { status: 404 });
  }

  // For now, return JSON that the frontend can convert to PDF using a library like jsPDF or pdfmake
  // In production, you'd use a proper PDF generation library on the server
  const exportData = {
    id: diary.id,
    date: diary.date,
    status: diary.status,
    project: diary.project?.name || "Unassigned",
    site: diary.site?.name || "Unassigned",
    weather: diary.weather,
    work_completed: diary.work_completed,
    planned_works: diary.planned_works,
    notes: diary.notes,
    labor: diary.labor || [],
    equipment: diary.equipment || [],
    issues: diary.issues || [],
    photo_count: (diary.photos || []).length,
    completed_at: diary.completed_at,
  };

  if (format === "docx") {
    // Return Word-compatible HTML. This is not a true DOCX package, so use a
    // legacy .doc extension and content type that Word can still open.
    const html = generateDiaryHTML(exportData);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="site-capture-${exportData.date}.doc"`,
      },
    });
  }

  // Default: PDF flow returns printable HTML so the browser can open it and the
  // user can save it as PDF via the print dialog.
  const html = generateDiaryHTML(exportData);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="site-capture-${exportData.date}.html"`,
    },
  });
}

function generateDiaryHTML(data: Record<string, unknown>): string {
  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const laborRows = ((data.labor as unknown[]) || [])
    .map(
      (l: unknown) => {
        const item = l as { trade_or_company: string; worker_count: number; hours_worked: number };
        return `
        <tr>
          <td>${item.trade_or_company}</td>
          <td>${item.worker_count}</td>
          <td>${item.hours_worked}h</td>
        </tr>
      `;
      }
    )
    .join("");

  const equipmentRows = ((data.equipment as unknown[]) || [])
    .map(
      (e: unknown) => {
        const item = e as { equipment_type: string; quantity: number; hours_used: number };
        return `
        <tr>
          <td>${item.equipment_type}</td>
          <td>${item.quantity}</td>
          <td>${item.hours_used}h</td>
        </tr>
      `;
      }
    )
    .join("");

  const issueRows = ((data.issues as unknown[]) || [])
    .map(
      (i: unknown) => {
        const item = i as { type: string; description: string; responsible_party: string | null; delay_hours: number | null };
        return `
        <tr>
          <td><strong>${item.type}</strong></td>
          <td>${item.description}</td>
          <td>${item.responsible_party || "-"}</td>
          <td>${item.delay_hours ? item.delay_hours + "h" : "-"}</td>
        </tr>
      `;
      }
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Site Diary - ${data.date}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    h2 { color: #334155; margin-top: 30px; font-size: 1.2em; }
    .header-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .header-info p { margin: 5px 0; }
    .section { margin: 20px 0; }
    .section-content {
      background: #fff;
      border: 1px solid #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    .weather-box {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      display: inline-block;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-draft { background: #fef3c7; color: #92400e; }
    .print-button {
      background: #0ea5e9;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 1em;
      cursor: pointer;
      margin-bottom: 20px;
    }
    .print-button:hover { background: #0284c7; }
    @media print {
      .print-button { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
  
  <h1>Site Diary</h1>
  
  <div class="header-info">
    <p><strong>Date:</strong> ${formatDate(data.date as string)}</p>
    <p><strong>Project:</strong> ${data.project}</p>
    <p><strong>Site:</strong> ${data.site}</p>
    <p><strong>Status:</strong> <span class="status-badge status-${data.status}">${data.status}</span></p>
  </div>

  <div class="section">
    <h2>☀️ Weather</h2>
    <div class="weather-box">
      <p><strong>Conditions:</strong> ${(data.weather as { conditions: string })?.conditions || "Not recorded"}</p>
      <p><strong>Temperature:</strong> ${(data.weather as { temp_min: number; temp_max: number })?.temp_min ?? "-"}°C - ${(data.weather as { temp_min: number; temp_max: number })?.temp_max ?? "-"}°C</p>
      <p><strong>Wind:</strong> ${(data.weather as { wind: string })?.wind || "Not recorded"}</p>
    </div>
  </div>

  <div class="section">
    <h2>✅ Work Completed</h2>
    <div class="section-content">${data.work_completed || "No work recorded"}</div>
  </div>

  <div class="section">
    <h2>📅 Planned Works</h2>
    <div class="section-content">${data.planned_works || "No plans recorded"}</div>
  </div>

  <div class="section">
    <h2>👷 Labor</h2>
    ${laborRows ? `
    <table>
      <thead>
        <tr>
          <th>Company/Trade</th>
          <th>Workers</th>
          <th>Hours</th>
        </tr>
      </thead>
      <tbody>${laborRows}</tbody>
    </table>
    ` : "<p>No labor recorded</p>"}
  </div>

  ${equipmentRows ? `
  <div class="section">
    <h2>🚜 Equipment</h2>
    <table>
      <thead>
        <tr>
          <th>Equipment</th>
          <th>Quantity</th>
          <th>Hours</th>
        </tr>
      </thead>
      <tbody>${equipmentRows}</tbody>
    </table>
  </div>
  ` : ""}

  ${issueRows ? `
  <div class="section">
    <h2>⚠️ Issues</h2>
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Description</th>
          <th>Responsible</th>
          <th>Delay</th>
        </tr>
      </thead>
      <tbody>${issueRows}</tbody>
    </table>
  </div>
  ` : ""}

  ${data.notes ? `
  <div class="section">
    <h2>📝 Notes</h2>
    <div class="section-content">${data.notes}</div>
  </div>
  ` : ""}

  ${data.photo_count ? `
  <div class="section">
    <h2>📷 Photos</h2>
    <p>${data.photo_count} photo(s) attached. View in app for full images.</p>
  </div>
  ` : ""}

  ${data.completed_at ? `
  <div class="section" style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
    <p style="color: #64748b; font-size: 0.9em;">
      <strong>Completed:</strong> ${new Date(data.completed_at as string).toLocaleString("en-AU")}
    </p>
  </div>
  ` : ""}
</body>
</html>
  `;
}
