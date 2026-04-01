"use client";

/**
 * Voice-to-text hook using Web Speech API
 * Provides hands-free note entry for field use
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface VoiceToTextState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
}

export interface VoiceToTextActions {
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare const SpeechRecognition: {
  new (): SpeechRecognition;
};

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export function useVoiceToText(): VoiceToTextState & VoiceToTextActions {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    setError(null);
    finalTranscriptRef.current = transcript; // Preserve existing text

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-AU"; // Australian English for construction context

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        // Append final results to our stored transcript
        if (final) {
          finalTranscriptRef.current = finalTranscriptRef.current 
            ? `${finalTranscriptRef.current} ${final}`.trim()
            : final;
        }

        // Show interim + final combined
        setTranscript(
          finalTranscriptRef.current 
            ? `${finalTranscriptRef.current} ${interim}`.trim()
            : interim
        );
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please enable microphone permissions.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Try speaking louder.");
        } else if (event.error === "network") {
          setError("Network error. Check your connection.");
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        // Ensure final transcript is preserved
        if (finalTranscriptRef.current) {
          setTranscript(finalTranscriptRef.current);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setError("Failed to start speech recognition");
      setIsListening(false);
    }
  }, [transcript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    // Ensure final transcript is set
    if (finalTranscriptRef.current) {
      setTranscript(finalTranscriptRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    stopListening();
    setTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    reset,
  };
}
