"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import type { SiteVisit } from "@/lib/workspace/types";
import type { VisitEditFormData } from "@/lib/validation/schemas";
import { visitorTypes } from "@/lib/validation/schemas";
import { MobileCardList, MobileCardHeader, MobileStatusBadge, MobileActionButton } from "@/components/mobile/MobileCardList";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface VisitTableProps {
  visits: SiteVisit[];
  isLoading: boolean;
  editingId: string | null;
  canEdit: boolean;
  canDelete: boolean;
  signingOutId: string | null;
  deletingId: string | null;
  confirmDeleteId: string | null;
  registerEdit: UseFormRegister<VisitEditFormData>;
  editErrors: FieldErrors<VisitEditFormData>;
  editSignedOut: string | undefined;
  editIsValid: boolean;
  editSaving: boolean;
  onStartEdit: (visit: SiteVisit) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onSignOut: (visitId: string) => void;
  onDeleteClick: (visitId: string) => void;
  onConfirmDelete: (visitId: string) => void;
  onCancelDelete: () => void;
  onViewSignature: (signature: string) => void;
  onClearSignOut: () => void;
}

export function VisitTable({
  visits,
  isLoading,
  editingId,
  canEdit,
  canDelete,
  signingOutId,
  deletingId,
  confirmDeleteId,
  registerEdit,
  editErrors,
  editSignedOut,
  editIsValid,
  editSaving,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSignOut,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
  onViewSignature,
  onClearSignOut,
}: VisitTableProps) {
  if (visits.length === 0 && !isLoading) {
    return <p className="text-sm text-slate-500">No records match the current filters.</p>;
  }

  return (
    <MobileCardList
      data={visits}
      isLoading={isLoading}
      loadingRows={5}
      columns={[
        {
          key: "name",
          header: "Name",
          render: (visit) => (
            <MobileCardHeader
              title={editingId === visit.id ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    {...registerEdit("fullName")}
                    className={`w-full border ${editErrors.fullName ? "border-red-400" : "border-amber-400"} rounded-lg px-2 py-1.5 text-xs outline-none`}
                  />
                  {editErrors.fullName && (
                    <p className="text-[10px] text-red-500 mt-0.5">{editErrors.fullName.message}</p>
                  )}
                </div>
              ) : visit.full_name}
              subtitle={editingId === visit.id ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <input
                    {...registerEdit("companyName")}
                    className={`w-full border ${editErrors.companyName ? "border-red-400" : "border-amber-400"} rounded-lg px-2 py-1 text-xs mt-1 outline-none`}
                  />
                  {editErrors.companyName && (
                    <p className="text-[10px] text-red-500 mt-0.5">{editErrors.companyName.message}</p>
                  )}
                </div>
              ) : `${visit.company_name} • ${visit.visitor_type}`}
              badge={!visit.signed_out_at && !editingId ? (
                <MobileStatusBadge status="On site" variant="success" />
              ) : undefined}
            />
          ),
        },
        {
          key: "mobile",
          header: "Mobile",
          mobileVisible: false,
          render: (visit) => editingId === visit.id ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                {...registerEdit("phoneNumber")}
                className={`w-full border ${editErrors.phoneNumber ? "border-red-400" : "border-slate-300"} rounded-lg px-2 py-1.5 text-xs outline-none`}
              />
              {editErrors.phoneNumber && (
                <p className="text-[10px] text-red-500 mt-0.5">{editErrors.phoneNumber.message}</p>
              )}
            </div>
          ) : (visit.phone_number ?? "-"),
        },
        {
          key: "company",
          header: "Company",
          mobileVisible: false,
          render: (visit) => visit.company_name,
        },
        {
          key: "type",
          header: "Type",
          mobileVisible: false,
          render: (visit) => editingId === visit.id ? (
            <div onClick={(e) => e.stopPropagation()}>
              <select
                {...registerEdit("visitorType")}
                className={`w-full border ${editErrors.visitorType ? "border-red-400" : "border-slate-300"} rounded-lg px-2 py-1.5 text-xs bg-white outline-none`}
              >
                {visitorTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {editErrors.visitorType && (
                <p className="text-[10px] text-red-500 mt-0.5">{editErrors.visitorType.message}</p>
              )}
            </div>
          ) : visit.visitor_type,
        },
        {
          key: "signedIn",
          header: "Signed In",
          render: (visit) => editingId === visit.id ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="datetime-local"
                {...registerEdit("signedInAt")}
                className={`w-full border ${editErrors.signedInAt ? "border-red-400" : "border-amber-400"} rounded-lg px-2 py-1.5 text-xs outline-none`}
              />
              {editErrors.signedInAt && (
                <p className="text-[10px] text-red-500 mt-0.5">{editErrors.signedInAt.message}</p>
              )}
            </div>
          ) : formatDateTime(visit.signed_in_at),
        },
        {
          key: "signedOut",
          header: "Signed Out",
          render: (visit) => editingId === visit.id ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="datetime-local"
                {...registerEdit("signedOutAt")}
                className={`w-full border ${editErrors.signedOutAt ? "border-red-400" : "border-slate-300"} rounded-lg px-2 py-1.5 text-xs outline-none`}
              />
              {editSignedOut && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearSignOut();
                  }}
                  className="mt-1 text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Clear sign out
                </button>
              )}
              {editErrors.signedOutAt && (
                <p className="text-[10px] text-red-500 mt-0.5">{editErrors.signedOutAt.message}</p>
              )}
            </div>
          ) : visit.signed_out_at ? (
            formatDateTime(visit.signed_out_at)
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
        },
        {
          key: "signature",
          header: "Signature",
          mobileVisible: false,
          render: (visit) =>
            visit.signature ? (
              <button
                onClick={() => onViewSignature(visit.signature!)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View
              </button>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            ),
        },
        {
          key: "actions",
          header: "Actions",
          render: (visit) => {
            if (editingId === visit.id) {
              return (
                <div className="flex items-center gap-2">
                  <MobileActionButton
                    onClick={onSaveEdit}
                    variant="primary"
                    disabled={editSaving || !editIsValid}
                  >
                    {editSaving ? "Saving..." : "Save"}
                  </MobileActionButton>
                  <MobileActionButton onClick={onCancelEdit} variant="ghost">
                    Cancel
                  </MobileActionButton>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && (
                  <MobileActionButton onClick={() => onStartEdit(visit)} variant="ghost">
                    Edit
                  </MobileActionButton>
                )}
                {!visit.signed_out_at && (
                  <MobileActionButton
                    onClick={() => onSignOut(visit.id)}
                    variant="primary"
                    disabled={!!signingOutId}
                  >
                    {!!signingOutId ? "..." : "Sign Out"}
                  </MobileActionButton>
                )}
                {canDelete && (
                  <>
                    {confirmDeleteId === visit.id ? (
                      <div className="flex items-center gap-1">
                        <MobileActionButton
                          onClick={() => onConfirmDelete(visit.id)}
                          variant="danger"
                          disabled={!!deletingId}
                        >
                          {!!deletingId ? "..." : "Confirm"}
                        </MobileActionButton>
                        <MobileActionButton onClick={onCancelDelete} variant="ghost">
                          Cancel
                        </MobileActionButton>
                      </div>
                    ) : (
                      <MobileActionButton onClick={() => onDeleteClick(visit.id)} variant="danger">
                        Delete
                      </MobileActionButton>
                    )}
                  </>
                )}
              </div>
            );
          },
        },
      ]}
    />
  );
}
