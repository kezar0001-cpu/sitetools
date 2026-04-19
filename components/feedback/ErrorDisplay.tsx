"use client";

import { AlertCircle, X, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export type ErrorVariant = "field" | "toast" | "banner";
export type FeedbackType = "error" | "warning" | "success";

interface ErrorDisplayProps {
  variant: ErrorVariant;
  message: string;
  type?: FeedbackType;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const typeConfig = {
  error: {
    icon: AlertCircle,
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    dismissColor: "text-red-400 hover:text-red-600",
  },
  warning: {
    icon: AlertTriangle,
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-400",
    dismissColor: "text-amber-400 hover:text-amber-600",
  },
  success: {
    icon: CheckCircle,
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-500",
    dismissColor: "text-emerald-400 hover:text-emerald-600",
  },
};

export function ErrorDisplay({
  variant,
  message,
  type = "error",
  onDismiss,
  action,
  className = "",
}: ErrorDisplayProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Field variant - inline error below input
  if (variant === "field") {
    return (
      <p className={`text-xs text-red-600 mt-1 ${className}`}>
        {message}
      </p>
    );
  }

  // Toast variant - uses sonner
  if (variant === "toast") {
    if (type === "success") {
      toast.success(message);
    } else if (type === "warning") {
      toast.warning(message);
    } else {
      toast.error(message);
    }
    return null;
  }

  // Banner variant - full-width at top of content
  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-xl px-4 py-3 flex items-center justify-between ${className}`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
        <span className={`text-sm font-semibold ${config.textColor} truncate`}>
          {message}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {action && (
          <button
            onClick={action.onClick}
            className={`text-xs font-semibold underline ${config.textColor} hover:opacity-80`}
          >
            {action.label}
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-2 ${config.dismissColor} font-bold p-1 rounded hover:bg-black/5 transition-colors`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Specialized banner components for common patterns
interface FeedbackBannerProps {
  message: string;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function ErrorBanner({ message, onDismiss, action, className = "" }: FeedbackBannerProps) {
  return (
    <ErrorDisplay
      variant="banner"
      type="error"
      message={message}
      onDismiss={onDismiss}
      action={action}
      className={className}
    />
  );
}

export function WarningBanner({ message, onDismiss, action, className = "" }: FeedbackBannerProps) {
  return (
    <ErrorDisplay
      variant="banner"
      type="warning"
      message={message}
      onDismiss={onDismiss}
      action={action}
      className={className}
    />
  );
}

export function SuccessBanner({ message, onDismiss, action, className = "" }: FeedbackBannerProps) {
  return (
    <ErrorDisplay
      variant="banner"
      type="success"
      message={message}
      onDismiss={onDismiss}
      action={action}
      className={className}
    />
  );
}

// Inline field error helper
interface FieldErrorProps {
  message?: string | null;
  className?: string;
}

export function FieldError({ message, className = "" }: FieldErrorProps) {
  if (!message) return null;
  return <p className={`text-xs text-red-600 mt-1 ${className}`}>{message}</p>;
}

// Toast helpers that wrap sonner
export function showErrorToast(message: string) {
  toast.error(message);
}

export function showSuccessToast(message: string) {
  toast.success(message);
}

export function showWarningToast(message: string) {
  toast.warning(message);
}
