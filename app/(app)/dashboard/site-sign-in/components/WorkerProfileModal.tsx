"use client";

import { useEffect, useState } from "react";
import { X, Clock, Calendar, Building2, User, Phone, MapPin, History } from "lucide-react";
import { ModuleLoadingState } from "@/components/loading";
import { ErrorBanner } from "@/components/feedback";
import { supabase } from "@/lib/supabase";

interface WorkerHistoryVisit {
  id: string;
  site_id: string;
  site_name: string;
  full_name: string;
  phone_number: string | null;
  company_name: string;
  visitor_type: string;
  signed_in_at: string;
  signed_out_at: string | null;
  duration_minutes: number | null;
}

interface WorkerHistorySummary {
  full_name: string;
  company_name: string;
  visitor_type: string;
  phone_number: string | null;
  total_visits: number;
  total_hours_on_site: number;
  first_visit_date: string;
  last_visit_date: string;
}

interface WorkerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  fullName: string;
  workerCompanyName: string;
  phoneNumber: string | null;
  visitorType: string;
}

export function WorkerProfileModal({
  isOpen,
  onClose,
  companyId,
  fullName,
  workerCompanyName,
  phoneNumber,
  visitorType,
}: WorkerProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    summary: WorkerHistorySummary;
    recent_visits: WorkerHistoryVisit[];
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHistory(null);
      setError(null);
      return;
    }

    async function fetchWorkerHistory() {
      setLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("Not authenticated");
        }

        const params = new URLSearchParams({
          companyId,
          fullName,
          companyName: workerCompanyName,
          ...(phoneNumber && { phoneNumber }),
        });

        const response = await fetch(`/api/worker-history?${params}`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to load worker history");
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load worker history");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkerHistory();
  }, [isOpen, companyId, fullName, workerCompanyName, phoneNumber]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatDuration(minutes: number | null): string {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  function getVisitorBadgeColor(type: string): string {
    switch (type) {
      case "Worker":
        return "bg-blue-100 text-blue-700";
      case "Subcontractor":
        return "bg-purple-100 text-purple-700";
      case "Visitor":
        return "bg-green-100 text-green-700";
      case "Delivery":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  const displaySummary = history?.summary || {
    full_name: fullName,
    company_name: workerCompanyName,
    visitor_type: visitorType,
    phone_number: phoneNumber,
    total_visits: 0,
    total_hours_on_site: 0,
    first_visit_date: "",
    last_visit_date: "",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start sm:items-center justify-center px-4 py-6 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{fullName}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                <span>{workerCompanyName}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-12">
              <ModuleLoadingState variant="spinner" size="lg" message="Loading worker history..." />
            </div>
          ) : error ? (
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
              action={{ label: "Retry", onClick: () => window.location.reload() }}
            />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {/* Type Badge */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Type</span>
                  <span className={`inline-block mt-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getVisitorBadgeColor(displaySummary.visitor_type)}`}>
                    {displaySummary.visitor_type}
                  </span>
                </div>

                {/* Total Visits */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Visits</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <History className="h-4 w-4 text-slate-400" />
                    <span className="text-lg font-bold text-slate-900">
                      {displaySummary.total_visits}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Last 30 days</span>
                </div>

                {/* Total Hours */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Time on Site</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-lg font-bold text-slate-900">
                      {displaySummary.total_hours_on_site}h
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Total hours</span>
                </div>

                {/* First Visit */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">First Visit</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-900">
                      {displaySummary.first_visit_date
                        ? formatDate(displaySummary.first_visit_date)
                        : "—"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {displaySummary.last_visit_date && displaySummary.last_visit_date !== displaySummary.first_visit_date
                      ? `Last: ${formatDate(displaySummary.last_visit_date)}`
                      : "No recent activity"}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              {displaySummary.phone_number && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-6 bg-slate-50 rounded-lg px-4 py-3">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{displaySummary.phone_number}</span>
                </div>
              )}

              {/* Recent Visits */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Recent Sign-Ins (Last 30 Days)
                </h3>

                {history?.recent_visits.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl">
                    <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No sign-in history found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      This worker has no recorded visits in the last 30 days
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-semibold text-slate-700 text-xs">Site</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-slate-700 text-xs">Signed In</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-slate-700 text-xs">Duration</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-slate-700 text-xs">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {history?.recent_visits.map((visit) => (
                            <tr key={visit.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">{visit.site_name}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {formatDateTime(visit.signed_in_at)}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {formatDuration(visit.duration_minutes)}
                              </td>
                              <td className="px-4 py-3">
                                {visit.signed_out_at ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                    Signed Out
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                    On Site
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
