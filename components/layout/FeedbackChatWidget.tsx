"use client";

import Image from "next/image";
import { useState } from "react";

const SUPPORT_EMAIL = "admin@buildstate.com.au";

export function FeedbackChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const captureScreenshot = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus("Screen capture is not available in this browser.");
      return;
    }

    setIsCapturing(true);
    setStatus(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      const video = document.createElement("video");
      video.srcObject = stream;
      video.playsInline = true;

      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Failed to capture the screen.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setScreenshotDataUrl(canvas.toDataURL("image/png"));
      setStatus("Screenshot captured. It will be downloaded when you send feedback.");

      track.stop();
      stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    } catch {
      setStatus("Screenshot capture was cancelled.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = () => {
    if (!message.trim()) {
      setStatus("Please add your feedback message.");
      return;
    }

    const page = typeof window !== "undefined" ? window.location.href : "";
    const body = [
      "Buildstate feedback",
      "",
      `Message: ${message.trim()}`,
      `Contact email: ${email.trim() || "Not provided"}`,
      `Page: ${page}`,
      `Submitted at: ${new Date().toLocaleString()}`,
      "",
      screenshotDataUrl
        ? "A screenshot was captured and downloaded as an attachment. Please attach it before sending this email."
        : "No screenshot attached.",
    ].join("\n");

    const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Website feedback")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoHref;

    if (screenshotDataUrl) {
      const screenshotFilename = `buildstate-feedback-${new Date().toISOString().replace(/[.:]/g, "-")}.png`;
      const link = document.createElement("a");
      link.href = screenshotDataUrl;
      link.download = screenshotFilename;
      link.click();
    }

    setStatus("Your email app has been opened.");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div className="w-[340px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Feedback chat</p>
              <p className="text-xs text-slate-500">Send feedback to {SUPPORT_EMAIL}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close feedback chat"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email (optional)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:ring"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="Tell us what happened and what we can improve..."
              className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-amber-300 transition focus:ring"
            />

            {screenshotDataUrl ? (
              <Image
                src={screenshotDataUrl}
                alt="Captured screenshot preview"
                width={600}
                height={320}
                unoptimized
                className="max-h-32 w-full rounded-lg border border-slate-200 object-cover"
              />
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                {isCapturing ? "Capturing..." : "Take screenshot"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Send feedback
              </button>
            </div>

            {status ? <p className="text-xs text-slate-500">{status}</p> : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800"
        >
          Chat feedback
        </button>
      )}
    </div>
  );
}
