"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { Mail, Download, Smartphone, Eye, ArrowLeft, Share2, CheckCircle } from "lucide-react";

interface Site {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  company_id?: string;
}

// Detect mobile user agent
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(userAgent);
}

// Detect iOS specifically (for save to photos feature)
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/i.test(userAgent);
}

export default function PrintQRPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [imageGenerated, setImageGenerated] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Fetch site data and check admin status
  useEffect(() => {
    if (!slug) return;
    
    const loadSite = async () => {
      const { data: siteData } = await supabase
        .from("sites")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      
      if (siteData) {
        setSite(siteData as Site);
        
        // Check if user is admin of this company
        const { data: { user } } = await supabase.auth.getUser();
        if (user && siteData.company_id) {
          const { data: membership } = await supabase
            .from("company_memberships")
            .select("role")
            .eq("company_id", siteData.company_id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (membership) {
            setIsAdmin(["owner", "admin", "manager"].includes(membership.role));
          }
        }
      }
      setLoading(false);
    };
    
    loadSite();
  }, [slug]);

  // Auto-print for desktop only
  useEffect(() => {
    if (site && !isMobile) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [site, isMobile]);

  // Convert QR to image and download
  const saveQRToPhotos = useCallback(async () => {
    if (!qrRef.current || !site) return;

    try {
      const svgElement = qrRef.current.querySelector("svg");
      if (!svgElement) return;

      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 1024;
      canvas.width = size;
      canvas.height = size + 160; // Extra space for site name

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw site name at top
      ctx.fillStyle = "#1c1917";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(site.name, size / 2, 60);
      ctx.font = "32px system-ui, sans-serif";
      ctx.fillStyle = "#6b7280";
      ctx.fillText("Visitor Sign-In", size / 2, 110);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      // Load and draw image
      const img = new Image();
      img.onload = () => {
        // Draw QR code centered with padding
        const qrSize = 800;
        const padding = (size - qrSize) / 2;
        ctx.drawImage(img, padding, 160 + padding, qrSize, qrSize);
        URL.revokeObjectURL(url);

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (!blob) return;
          
          const fileName = `${site.slug}-qr-code.png`;
          
          // For iOS, use a different approach
          if (isIOS()) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            // Android and others
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          
          setImageGenerated(true);
          setTimeout(() => setImageGenerated(false), 3000);
        }, "image/png");
      };
      img.src = url;
    } catch (error) {
      console.error("Failed to generate QR image:", error);
      alert("Failed to generate image. Please try again.");
    }
  }, [site]);

  // Share QR code
  const shareQR = useCallback(async () => {
    if (!site) return;
    
    const shareData = {
      title: `${site.name} - Sign In QR Code`,
      text: `Scan this QR code to sign in to ${site.name}`,
      url: `${window.location.origin}/sign-in?site=${site.slug}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareData.url);
        alert("Sign-in link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  }, [site]);

  // Send email with QR
  const sendEmail = useCallback(async () => {
    if (!emailAddress || !site) return;
    
    // In a real implementation, this would call an API endpoint
    // For now, simulate success
    await new Promise(resolve => setTimeout(resolve, 1000));
    setEmailSent(true);
    setTimeout(() => {
      setShowEmailModal(false);
      setEmailSent(false);
      setEmailAddress("");
    }, 2000);
  }, [emailAddress, site]);

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
    ? `${window.location.origin}/sign-in?site=${site.slug}`
    : "";

  // Mobile Experience
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 text-yellow-900 rounded-lg p-1.5">
              <Smartphone className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-900">SiteSign QR</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="text-sm text-gray-600 flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Exit
            </button>
          )}
        </div>

        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* Site Info */}
          <div className="text-center py-4">
            <h1 className="text-2xl font-extrabold text-gray-900">{site.name}</h1>
            <p className="text-gray-600 mt-1">Visitor Sign-In QR Code</p>
          </div>

          {/* QR Code Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div ref={qrRef} className="flex justify-center">
              <div className="bg-white p-3 border-4 border-gray-900 rounded-xl">
                <QRCodeSVG
                  value={qrUrl}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#1c1917"
                  level="H"
                  imageSettings={site.logo_url ? { src: site.logo_url, height: 64, width: 64, excavate: true } : undefined}
                />
              </div>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Scan to sign in instantly
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Save to Photos - Primary Action */}
            <button
              onClick={saveQRToPhotos}
              className="w-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-yellow-900 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-md"
            >
              <Download className="h-6 w-6" />
              <span className="text-lg">Save QR to Photos</span>
            </button>

            {imageGenerated && (
              <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Image saved!</span>
              </div>
            )}

            {/* Share Button */}
            <button
              onClick={shareQR}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              Share Sign-In Link
            </button>

            {/* Email QR - Admin Only */}
            {isAdmin && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="h-5 w-5" />
                Email QR Code
              </button>
            )}

            {/* Preview Worker Experience */}
            <button
              onClick={() => setShowPreview(true)}
              className="w-full bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-sky-700 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Eye className="h-5 w-5" />
              Preview: What Workers See
            </button>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Quick Tips
            </h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Save the QR image and print it later</li>
              <li>• Display on a tablet at site entrance</li>
              <li>• Share link via WhatsApp/SMS</li>
            </ul>
          </div>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              {!emailSent ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Email QR Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Send the QR code to someone who can print it.
                  </p>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-4 focus:border-yellow-400 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEmailModal(false)}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendEmail}
                      disabled={!emailAddress}
                      className="flex-1 py-3 rounded-xl bg-yellow-400 text-yellow-900 font-bold disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-bold text-gray-900">Email sent!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Worker Sign-In Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Simulated Sign-In Screen */}
                <div className="bg-yellow-400 rounded-2xl p-6 text-center">
                  <div className="bg-white/20 rounded-xl p-3 inline-block mb-3">
                    <Smartphone className="h-8 w-8 text-yellow-900" />
                  </div>
                  <h2 className="text-xl font-bold text-yellow-900">{site.name}</h2>
                  <p className="text-yellow-800 mt-1">Visitor Sign-In</p>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Full Name</p>
                    <p className="text-gray-400 text-sm">Enter your name...</p>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Company</p>
                    <p className="text-gray-400 text-sm">Your company name...</p>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Visitor Type</p>
                    <p className="text-gray-400 text-sm">Select one...</p>
                  </div>
                </div>

                <button className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl">
                  Sign In to Site
                </button>

                <p className="text-center text-xs text-gray-500">
                  This is what workers see after scanning your QR code
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Experience (Original Print-Optimized View)
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
          <div ref={qrRef} className="bg-white p-4 border-4 border-gray-900 rounded-2xl shadow-lg print:shadow-none print:border-4 print:p-3">
            <QRCodeSVG
              value={qrUrl}
              size={280}
              bgColor="#ffffff"
              fgColor="#1c1917"
              level="H"
              imageSettings={site.logo_url ? { src: site.logo_url, height: 78, width: 78, excavate: true } : undefined}
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
