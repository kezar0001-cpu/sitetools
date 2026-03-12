"use client";

import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";

const SUPPORT_EMAIL = "admin@buildstate.com.au";

export function FeedbackChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [uploadedPhotoDataUrl, setUploadedPhotoDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

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

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedPhotoDataUrl(reader.result);
        setStatus("Photo attached. It will be downloaded when you send feedback.");
      }
    };
    reader.onerror = () => {
      setStatus("We could not load that photo. Try another image.");
    };
    reader.readAsDataURL(file);
  };

  const downloadAttachment = (dataUrl: string, filenamePrefix: string) => {
    const filename = `${filenamePrefix}-${new Date().toISOString().replace(/[.:]/g, "-")}.png`;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const handleSubmit = () => {
    if (!message.trim()) {
      setStatus("Please add your feedback message.");
      return;
    }

    setIsSending(true);

    const page = typeof window !== "undefined" ? window.location.href : "";
    const hasAttachment = Boolean(screenshotDataUrl || uploadedPhotoDataUrl);
    const body = [
      "Buildstate feedback",
      "",
      `Message: ${message.trim()}`,
      `Contact email: ${email.trim() || "Not provided"}`,
      `Page: ${page}`,
      `Submitted at: ${new Date().toLocaleString()}`,
      "",
      hasAttachment
        ? "Attachment(s) were downloaded. Please attach them to this email before sending."
        : "No attachment included.",
    ].join("\n");

    const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Website feedback")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoHref;

    if (screenshotDataUrl) {
      downloadAttachment(screenshotDataUrl, "buildstate-feedback-screenshot");
    }

    if (uploadedPhotoDataUrl) {
      downloadAttachment(uploadedPhotoDataUrl, "buildstate-feedback-photo");
    }

    setStatus("Your email app has been opened.");
    setIsSending(false);
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

            {uploadedPhotoDataUrl ? (
              <Image
                src={uploadedPhotoDataUrl}
                alt="Uploaded photo preview"
                width={600}
                height={320}
                unoptimized
                className="max-h-32 w-full rounded-lg border border-slate-200 object-cover"
              />
            ) : null}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
            />

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
                onClick={() => photoInputRef.current?.click()}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Upload photo
              </button>
            </div>

            <button
              type="button"
                onClick={handleSubmit}
                disabled={isSending}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isSending ? "Opening email..." : "Send feedback"}
              </button>

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
