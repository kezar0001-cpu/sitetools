"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";

interface Site {
  id: string;
  name: string;
  slug: string;
}

export default function PrintQRPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.from("sites").select("*").eq("slug", slug).maybeSingle()
      .then(({ data }) => {
        if (data) setSite(data as Site);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    // Auto-print after page loads
    if (site) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [site]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">Site not found</p>
      </div>
    );
  }

  const qrUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?site=${site.slug}`
    : "";

  return (
    <div className="min-h-screen bg-white p-8 print:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 print:mb-4">
          <div className="inline-flex items-center gap-3 mb-3 print:mb-2">
            <div className="bg-yellow-400 text-yellow-900 rounded-xl p-2 print:p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 print:h-7 print:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-1 print:text-3xl print:mb-1">{site.name}</h1>
          <p className="text-xl font-semibold text-gray-600 print:text-lg">Visitor Sign-In</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6 print:mb-4">
          <div className="bg-white p-4 border-4 border-gray-900 rounded-2xl shadow-lg print:shadow-none print:border-4 print:p-3">
            <QRCodeSVG
              value={qrUrl}
              size={280}
              bgColor="#ffffff"
              fgColor="#1c1917"
              level="H"
              className="print:w-64 print:h-64"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 print:space-y-3">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-5 print:p-4">
            <h2 className="text-xl font-extrabold text-gray-900 mb-3 print:text-lg print:mb-2">How to Use</h2>
            <ol className="space-y-2 print:space-y-1.5">
              <li className="flex gap-2 print:gap-2">
                <span className="flex-shrink-0 w-7 h-7 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold text-sm print:w-6 print:h-6 print:text-xs">1</span>
                <div>
                  <p className="font-bold text-gray-900 text-base print:text-sm">Scan the QR Code</p>
                  <p className="text-gray-600 text-sm print:text-xs">Use your phone camera to scan the code above</p>
                </div>
              </li>
              <li className="flex gap-2 print:gap-2">
                <span className="flex-shrink-0 w-7 h-7 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold text-sm print:w-6 print:h-6 print:text-xs">2</span>
                <div>
                  <p className="font-bold text-gray-900 text-base print:text-sm">Fill in Your Details</p>
                  <p className="text-gray-600 text-sm print:text-xs">Enter your name, company, and visitor type</p>
                </div>
              </li>
              <li className="flex gap-2 print:gap-2">
                <span className="flex-shrink-0 w-7 h-7 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold text-sm print:w-6 print:h-6 print:text-xs">3</span>
                <div>
                  <p className="font-bold text-gray-900 text-base print:text-sm">Sign In to Site</p>
                  <p className="text-gray-600 text-sm print:text-xs">Tap the yellow button to confirm your arrival</p>
                </div>
              </li>
              <li className="flex gap-2 print:gap-2">
                <span className="flex-shrink-0 w-7 h-7 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold text-sm print:w-6 print:h-6 print:text-xs">4</span>
                <div>
                  <p className="font-bold text-gray-900 text-base print:text-sm">Sign Out When Leaving</p>
                  <p className="text-gray-600 text-sm print:text-xs">Tap &ldquo;Sign Out&rdquo; and provide your signature before leaving the site</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl p-4 print:p-3">
            <p className="text-center text-xs text-gray-500 print:text-xs">
              <strong className="text-gray-900">Important:</strong> All visitors must sign in and out for safety and compliance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center print:mt-3">
          <p className="text-xs text-gray-400 print:text-xs">SiteSign — Construction Site Access Management</p>
        </div>

        {/* Print button (hidden when printing) */}
        <div className="mt-8 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print This Page
          </button>
        </div>
      </div>
    </div>
  );
}
