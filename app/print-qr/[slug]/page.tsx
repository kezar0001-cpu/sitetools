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
    <div className="min-h-screen bg-white p-8 print:p-0">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 print:mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="bg-yellow-400 text-yellow-900 rounded-xl p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 print:text-5xl">{site.name}</h1>
          <p className="text-xl font-semibold text-gray-600 print:text-2xl">Visitor Sign-In</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-8 print:mb-12">
          <div className="bg-white p-6 border-4 border-gray-900 rounded-2xl shadow-lg print:shadow-none print:border-8">
            <QRCodeSVG
              value={qrUrl}
              size={320}
              bgColor="#ffffff"
              fgColor="#1c1917"
              level="H"
              className="print:w-96 print:h-96"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-6 print:space-y-8">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 print:p-8">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4 print:text-3xl print:mb-6">How to Use</h2>
            <ol className="space-y-3 print:space-y-4">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold print:w-10 print:h-10 print:text-lg">1</span>
                <div>
                  <p className="font-bold text-gray-900 text-lg print:text-xl">Scan the QR Code</p>
                  <p className="text-gray-600 print:text-lg">Use your phone camera to scan the code above</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold print:w-10 print:h-10 print:text-lg">2</span>
                <div>
                  <p className="font-bold text-gray-900 text-lg print:text-xl">Fill in Your Details</p>
                  <p className="text-gray-600 print:text-lg">Enter your name, company, and visitor type</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold print:w-10 print:h-10 print:text-lg">3</span>
                <div>
                  <p className="font-bold text-gray-900 text-lg print:text-xl">Sign In to Site</p>
                  <p className="text-gray-600 print:text-lg">Tap the yellow button to confirm your arrival</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center font-bold print:w-10 print:h-10 print:text-lg">4</span>
                <div>
                  <p className="font-bold text-gray-900 text-lg print:text-xl">Sign Out When Leaving</p>
                  <p className="text-gray-600 print:text-lg">Tap &ldquo;Sign Out&rdquo; and provide your signature before leaving the site</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl p-6 print:p-8">
            <p className="text-center text-sm text-gray-500 print:text-base">
              <strong className="text-gray-900">Important:</strong> All visitors must sign in and out for safety and compliance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center print:mt-12">
          <p className="text-xs text-gray-400 print:text-sm">SiteSign — Construction Site Access Management</p>
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
