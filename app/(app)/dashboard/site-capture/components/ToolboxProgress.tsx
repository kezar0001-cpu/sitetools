"use client";

import type { ToolboxTalkFull } from "@/lib/site-capture/types";

interface Props {
  diary: ToolboxTalkFull;
}

export function ToolboxProgress({ diary }: Props) {
  const data = diary.toolbox_talk_data ?? {};
  
  // Calculate progress
  const requiredFields = [
    data.topic_title,
    data.talk_date,
    data.conducted_by_name,
  ];
  const requiredCompleted = requiredFields.filter(Boolean).length;
  const requiredProgress = Math.round((requiredCompleted / requiredFields.length) * 100);

  const hasAttendees = diary.attendees.length > 0;
  const signedAttendees = diary.attendees.filter(a => a.signature_data || a.signed_on_paper).length;
  const attendanceProgress = hasAttendees
    ? Math.round((signedAttendees / diary.attendees.length) * 100)
    : 0;

  const isPresenterSigned = !!data.presenter_signature;

  // Overall completion
  const overallSteps = [
    requiredProgress === 100, // Details complete
    hasAttendees, // Has attendees
    signedAttendees === diary.attendees.length && hasAttendees, // All attendees signed
    isPresenterSigned, // Presenter signed
  ];
  const overallComplete = overallSteps.filter(Boolean).length;
  const overallProgress = Math.round((overallComplete / overallSteps.length) * 100);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">Completion</h3>
        <span className="text-sm font-medium text-slate-600">{overallProgress}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            overallProgress === 100 ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Summary stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-semibold text-slate-800">{diary.attendees.length}</p>
          <p className="text-xs text-slate-500">Attendees</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-semibold text-slate-800">{signedAttendees}</p>
          <p className="text-xs text-slate-500">Signed</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-semibold text-slate-800">{diary.actions.length}</p>
          <p className="text-xs text-slate-500">Actions</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <svg className={`w-4 h-4 ${requiredProgress === 100 ? "text-emerald-500" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className={requiredProgress === 100 ? "text-slate-700" : "text-slate-400"}>
            Talk details complete
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <svg className={`w-4 h-4 ${hasAttendees ? "text-emerald-500" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className={hasAttendees ? "text-slate-700" : "text-slate-400"}>
            Attendees added
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <svg className={`w-4 h-4 ${signedAttendees === diary.attendees.length && hasAttendees ? "text-emerald-500" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className={signedAttendees === diary.attendees.length && hasAttendees ? "text-slate-700" : "text-slate-400"}>
            All attendees signed ({signedAttendees}/{diary.attendees.length})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <svg className={`w-4 h-4 ${isPresenterSigned ? "text-emerald-500" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className={isPresenterSigned ? "text-slate-700" : "text-slate-400"}>
            Presenter signed off
          </span>
        </div>
      </div>
    </div>
  );
}
