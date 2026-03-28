"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ItpErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ItpErrorBoundary] Caught rendering error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Something went wrong loading this ITP</h3>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors active:scale-95"
              >
                Reload
              </button>
              <a
                href="mailto:support@siteitp.com"
                className="text-sm text-slate-500 hover:text-violet-600 transition-colors"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
