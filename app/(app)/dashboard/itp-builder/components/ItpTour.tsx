"use client";

import "driver.js/dist/driver.css";
import { driver } from "driver.js";
import { MutableRefObject, useEffect, useRef } from "react";

const DISMISSED_KEY = "siteitp_tour_dismissed";

export interface ItpTourProps {
  /** Ref that will be populated with the startTour function for external triggering. */
  startTourRef: MutableRefObject<(() => void) | null>;
  /** Called to open the Create ITP modal so step 1 target is in the DOM. */
  onRequestOpenModal: () => void;
  /** Called to close the Create ITP modal after step 1. */
  onRequestCloseModal: () => void;
}

export default function ItpTour({
  startTourRef,
  onRequestOpenModal,
  onRequestCloseModal,
}: ItpTourProps) {
  const autoStartedRef = useRef(false);

  function startTour() {
    // Open the modal so the creation-mode selector is in the DOM
    onRequestOpenModal();

    // Wait for modal animation to complete before driving
    setTimeout(() => {
      // Use a wrapper so callbacks can reference the driver instance via closure
      const ref: { d: ReturnType<typeof driver> | null } = { d: null };

      ref.d = driver({
        showProgress: true,
        animate: true,
        overlayOpacity: 0.6,
        stagePadding: 8,
        stageRadius: 12,
        steps: [
          {
            element: "#itp-creation-mode",
            popover: {
              title: "Create an ITP",
              description:
                "Start by describing an inspection task or uploading a document.",
              onNextClick: () => {
                onRequestCloseModal();
                ref.d?.moveNext();
              },
            },
          },
          {
            element: "#itp-session-list",
            popover: {
              title: "Your ITP Sessions",
              description: "Your ITPs are organized here by project.",
            },
          },
          {
            element: "#itp-item-qr",
            popover: {
              title: "QR Code Sign-Off",
              description:
                "Share QR codes with inspectors for field sign-off.",
            },
          },
          {
            element: "#itp-pdf-export",
            popover: {
              title: "Export PDF Reports",
              description: "Export completed ITPs as PDF reports.",
            },
          },
        ],
        onDestroyStarted: () => {
          onRequestCloseModal();
          localStorage.setItem(DISMISSED_KEY, "1");
          ref.d?.destroy();
        },
      });

      ref.d.drive();
    }, 350);
  }

  // Expose startTour to parent via ref
  startTourRef.current = startTour;

  useEffect(() => {
    if (autoStartedRef.current) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) {
      autoStartedRef.current = true;
      const timer = setTimeout(startTour, 900);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
