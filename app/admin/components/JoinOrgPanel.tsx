"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface JoinOrgPanelProps {
  userId: string;
  onOrgJoined?: () => void;
}

interface Organisation { 
  id: string; 
  name: string; 
  created_at: string; 
  is_public?: boolean; 
  description?: string | null; 
}

interface TransferRequest {
  id: string;
  org_id: string;
  from_user_id: string;
  to_user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  organisations?: Organisation;
}

export function JoinOrgPanel({ userId, onOrgJoined }: JoinOrgPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);

  const fetchTransferRequests = useCallback(async () => {
    const { data } = await supabase
      .from("org_transfer_requests")
      .select("*, organisations(*)")
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) {
      setTransferRequests(data as TransferRequest[]);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchTransferRequests();
    }
  }, [isOpen, fetchTransferRequests]);

  async function joinByCode() {
    if (!joinCode.trim()) {
      setError("Please enter a join code");
      return;
    }
    
    setJoining(true);
    setError(null);
    
    const { data, error } = await supabase.rpc("join_by_code", {
      p_join_code: joinCode.trim(),
      p_user_id: userId
    });
    
    setJoining(false);
    
    if (error || !data) {
      setError(error?.message || "Failed to join organization");
      return;
    }
    
    const result = data as { success: boolean; message: string };
    if (result.success) {
      setSuccess(result.message);
      setJoinCode("");
      onOrgJoined?.();
    } else {
      setError(result.message);
    }
  }

  async function acceptTransfer(requestId: string) {
    const { data, error } = await supabase.rpc("accept_org_transfer", {
      p_request_id: requestId
    });
    
    if (error || !data) {
      setError(error?.message || "Failed to accept transfer");
      return;
    }
    
    const result = data as { success: boolean; message: string };
    if (result.success) {
      setSuccess(result.message);
      onOrgJoined?.();
    } else {
      setError(result.message);
    }
  }

  async function declineTransfer(requestId: string) {
    const { error } = await supabase
      .from("org_transfer_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId);
    
    if (error) {
      setError("Failed to decline transfer");
      return;
    }
    
    fetchTransferRequests();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 rounded-lg p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">Join Organization</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-300 text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
              {success}
            </div>
          )}

          {/* Transfer Requests */}
          {transferRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Transfer Requests</h3>
              <p className="text-xs text-gray-600">You have been invited to become an admin of these organizations:</p>
              
              <ul className="space-y-2">
                {transferRequests.map((req: TransferRequest) => (
                  <li key={req.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {req.organisations?.name || "Unknown Organization"}
                        </p>
                        {req.message && (
                          <p className="text-xs text-gray-600 mt-1">&ldquo;{req.message}&rdquo;</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          From: {req.from_user_id} • {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptTransfer(req.id)}
                          className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1 rounded text-sm transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineTransfer(req.id)}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold px-3 py-1 rounded text-sm transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Join by Code */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Join with Code</h3>
            <p className="text-xs text-gray-600">Enter a join code provided by an organization admin.</p>
            
            <div className="space-y-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter join code (e.g., ABC123XYZ789)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <button
                onClick={joinByCode}
                disabled={joining || !joinCode.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {joining ? "Joining..." : "Join Organization"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
