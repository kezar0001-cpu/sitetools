"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Building2, Clock, Check, ChevronDown, X } from "lucide-react";

// localStorage key helper for recent companies
const RECENT_COMPANIES_KEY = (siteId: string) => `sitesign_recent_companies_${siteId}`;

// Maximum number of recent companies to store
const MAX_RECENT_COMPANIES = 10;

export interface CompanyAutocompleteProps {
  siteId: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  approvedCompanies?: string[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

interface RecentCompany {
  name: string;
  lastUsed: string;
  count: number;
}

// Utility functions for localStorage management
export function getRecentCompanies(siteId: string): RecentCompany[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_COMPANIES_KEY(siteId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentCompany[];
    return parsed
      .filter(c => c.name && c.name.trim())
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, MAX_RECENT_COMPANIES);
  } catch {
    return [];
  }
}

export function addRecentCompany(siteId: string, companyName: string): void {
  if (typeof window === "undefined" || !companyName.trim()) return;
  try {
    const recent = getRecentCompanies(siteId);
    const existingIndex = recent.findIndex(c => 
      c.name.toLowerCase() === companyName.trim().toLowerCase()
    );
    
    let updated: RecentCompany[];
    if (existingIndex >= 0) {
      // Update existing entry
      updated = recent.map((c, i) => 
        i === existingIndex 
          ? { ...c, lastUsed: new Date().toISOString(), count: c.count + 1 }
          : c
      );
    } else {
      // Add new entry
      updated = [
        { name: companyName.trim(), lastUsed: new Date().toISOString(), count: 1 },
        ...recent
      ].slice(0, MAX_RECENT_COMPANIES);
    }
    
    localStorage.setItem(RECENT_COMPANIES_KEY(siteId), JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function clearRecentCompanies(siteId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_COMPANIES_KEY(siteId));
  } catch {
    // Silently fail
  }
}

export function CompanyAutocomplete({
  siteId,
  value,
  onChange,
  onBlur,
  approvedCompanies = [],
  placeholder = "Employer / company",
  disabled = false,
  error = false,
  id,
  name,
  className = "",
}: CompanyAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent companies on mount
  useEffect(() => {
    setRecentCompanies(getRecentCompanies(siteId));
  }, [siteId]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  }, [onChange]);

  // Handle selecting a company from the dropdown
  const handleSelectCompany = useCallback((companyName: string) => {
    setInputValue(companyName);
    onChange(companyName);
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  // Clear the input
  const handleClear = useCallback(() => {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  // Show dropdown when focusing if we have suggestions
  const handleFocus = useCallback(() => {
    const hasSuggestions = recentCompanies.length > 0 || approvedCompanies.length > 0;
    if (hasSuggestions) {
      setIsOpen(true);
    }
  }, [recentCompanies.length, approvedCompanies.length]);

  // Handle blur
  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  // Combine and deduplicate suggestions
  const allSuggestions = (() => {
    const suggestionMap = new Map<string, { name: string; type: "recent" | "approved"; count?: number }>();
    
    // Add recent companies first (they take priority)
    recentCompanies.forEach(c => {
      suggestionMap.set(c.name.toLowerCase(), { name: c.name, type: "recent", count: c.count });
    });
    
    // Add approved companies if not already present
    approvedCompanies.forEach(name => {
      const key = name.toLowerCase();
      if (!suggestionMap.has(key)) {
        suggestionMap.set(key, { name, type: "approved" });
      }
    });
    
    // Filter by current input (case-insensitive substring match)
    const filter = inputValue.toLowerCase().trim();
    const filtered = filter 
      ? Array.from(suggestionMap.values()).filter(s => 
          s.name.toLowerCase().includes(filter)
        )
      : Array.from(suggestionMap.values());
    
    // Sort: recent first, then alphabetically
    return filtered.sort((a, b) => {
      if (a.type === "recent" && b.type !== "recent") return -1;
      if (a.type !== "recent" && b.type === "recent") return 1;
      return a.name.localeCompare(b.name);
    });
  })();

  const hasRecentCompanies = recentCompanies.length > 0;
  const hasApprovedCompanies = approvedCompanies.length > 0;
  const showSuggestions = isOpen && (hasRecentCompanies || hasApprovedCompanies);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="organization"
          className={`
            w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors
            ${error 
              ? "border-red-300 focus:border-red-400" 
              : "border-slate-200 focus:border-amber-400"
            }
            ${disabled ? "bg-slate-100 text-slate-400" : "bg-white"}
            ${className}
          `}
        />
        
        {/* Clear button - shown when there's input */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        
        {/* Dropdown trigger - shown when we have suggestions */}
        {(hasRecentCompanies || hasApprovedCompanies) && !disabled && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-auto">
          {/* Section header for recent companies */}
          {hasRecentCompanies && (
            <div className="sticky top-0 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Recent Companies
            </div>
          )}
          
          {allSuggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 italic">
              No matching companies found
            </div>
          ) : (
            allSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.name}-${index}`}
                type="button"
                onClick={() => handleSelectCompany(suggestion.name)}
                className={`
                  w-full px-4 py-2.5 text-left text-sm flex items-center justify-between
                  hover:bg-slate-50 transition-colors
                  ${suggestion.name === inputValue ? "bg-amber-50" : ""}
                `}
              >
                <span className="font-medium text-slate-700 truncate">
                  {suggestion.name}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {suggestion.name === inputValue && (
                    <Check className="h-4 w-4 text-amber-500" />
                  )}
                  {suggestion.type === "recent" && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {suggestion.count && suggestion.count > 1 ? `${suggestion.count} visits` : "Recent"}
                    </span>
                  )}
                  {suggestion.type === "approved" && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                      <Check className="h-3 w-3" />
                      Approved
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
          
          {/* Divider and free-text option if we have input that doesn't match exactly */}
          {inputValue.trim() && !allSuggestions.some(s => 
            s.name.toLowerCase() === inputValue.toLowerCase().trim()
          ) && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button
                type="button"
                onClick={() => {
                  onChange(inputValue.trim());
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">
                  Use &quot;<span className="font-medium text-slate-900">{inputValue.trim()}</span>&quot;
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CompanyAutocomplete;
