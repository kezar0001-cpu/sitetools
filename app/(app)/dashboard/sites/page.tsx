"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, X, Copy, Check, QrCode, Pencil, Archive, ChevronDown, ChevronUp, Upload, Trash2, ImageIcon, Building2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchCompanyProjects, setActiveSite, updateSite, projectKeys, uploadSiteLogo, removeSiteLogo } from "@/lib/workspace/client";
import { canManageSites } from "@/lib/workspace/permissions";
import { useWorkspace } from "@/lib/workspace/useWorkspace";
import { Project, Site } from "@/lib/workspace/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCompanySites, useInvalidateSites } from "@/hooks/useSites";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { siteKeys } from "@/lib/workspace/client";
import { SitesErrorFallback } from "@/components/error";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  siteCreationSchema,
  siteEditSchema,
  type SiteCreationFormData,
  type SiteEditFormData,
} from "@/lib/validation/schemas";
import { getDefaultTimezone, getTimezoneShortCode } from "@/lib/timezone";

function toSlug(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "site"}-${suffix}`;
}

export default function SitesPage() {
  const { loading, summary, refresh } = useWorkspace({ requireAuth: true, requireCompany: true });
  const activeCompanyId = summary?.activeMembership?.company_id ?? null;
  const activeRole = summary?.activeMembership?.role ?? null;
  const activeSiteId = summary?.profile?.active_site_id ?? null;

  // Use TanStack Query for sites with 5-min stale time
  const { sites, isLoading: sitesLoading, error: sitesError, refetch: refetchSites } = useCompanySites(activeCompanyId, {
    staleTime: 5 * 60 * 1000,
  });

  // Use TanStack Query for projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: projectKeys.company(activeCompanyId),
    queryFn: async () => {
      if (!activeCompanyId) return [];
      return fetchCompanyProjects(activeCompanyId);
    },
    enabled: !!activeCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  // For cache invalidation after mutations
  const { invalidateCompanySites } = useInvalidateSites();
  const queryClient = useQueryClient();

  const [createSuccess, setCreateSuccess] = useState<{ siteName: string; projectName: string | null } | null>(null);
  const [createLogoFile, setCreateLogoFile] = useState<File | null>(null);
  const [createLogoPreview, setCreateLogoPreview] = useState<string | null>(null);
  const [switchingSiteId, setSwitchingSiteId] = useState<string | null>(null);
  const [moveErrorSiteId, setMoveErrorSiteId] = useState<string | null>(null);

  // Debounced move state
  const [pendingMove, setPendingMove] = useState<{ siteId: string; projectId: string | null; projectName: string | null } | null>(null);
  const [savingSiteId, setSavingSiteId] = useState<string | null>(null);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Shake animation state for form validation
  const [shakeForm, setShakeForm] = useState(false);

  // Trigger shake animation on form validation error
  const triggerShake = useCallback(() => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 400);
  }, []);

  // Quick Add form state per project group
  const [quickAddValues, setQuickAddValues] = useState<Record<string, string>>({});

  // Project field lock and highlight state
  const [projectLocked, setProjectLocked] = useState(false);
  const [projectPulse, setProjectPulse] = useState(false);
  const createSiteSectionRef = useRef<HTMLElement>(null);
  const projectSelectRef = useRef<HTMLSelectElement>(null);

  // Edit modal state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Archive confirmation state
  const [archivingSiteId, setArchivingSiteId] = useState<string | null>(null);
  const [confirmArchiveSite, setConfirmArchiveSite] = useState<Site | null>(null);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile detection for bottom sheet pattern
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Expandable card sections state
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleCardExpanded = (siteId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  // Copy to clipboard state
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const handleCopySlug = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(slug);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
      toast.success("Slug copied to clipboard");
    } catch {
      toast.error("Could not copy slug");
    }
  };

  // Site creation form with react-hook-form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors, isSubmitting: creating, isValid: createIsValid },
    reset: resetCreate,
    setValue: setCreateValue,
    watch: watchCreate,
  } = useForm<SiteCreationFormData>({
    resolver: zodResolver(siteCreationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      projectId: "",
      timezone: getDefaultTimezone(),
    },
  });

  const createTimezone = watchCreate("timezone");

  // Site edit form with react-hook-form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: editSaving, isValid: editIsValid },
    reset: resetEdit,
    watch: watchEdit,
  } = useForm<SiteEditFormData>({
    resolver: zodResolver(siteEditSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      timezone: "Australia/Sydney",
    },
  });

  const editTimezone = watchEdit("timezone");

  const canEditSites = canManageSites(activeRole);

  // Sites and projects are now automatically fetched via TanStack Query

  const groupedSites = useMemo(() => {
    const map = new Map<string | null, Site[]>();

    // Initialize map with projects to preserve order
    projects.forEach(p => map.set(p.id, []));
    map.set(null, []); // For unassigned

    // Filter sites by search query
    const filteredSites = searchQuery.trim()
      ? sites.filter(site =>
          site.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
      : sites;

    filteredSites.forEach(site => {
      const pid = site.project_id || null;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)?.push(site);
    });

    return Array.from(map.entries()).map(([projectId, siteList]) => ({
      projectId,
      project: projects.find(p => p.id === projectId),
      sites: siteList
    })).filter(group => group.project || group.sites.length > 0);
  }, [sites, projects, searchQuery]);

  // Check if any sites match the search
  const totalMatchingSites = useMemo(() =>
    groupedSites.reduce((sum, group) => sum + group.sites.length, 0),
    [groupedSites]
  );

  // Escape regex special characters
  function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Highlight matching text in site name
  function HighlightedSiteName({ name, query }: { name: string; query: string }) {
    if (!query.trim()) return <>{name}</>;

    const parts = name.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-200 text-amber-900 rounded px-0.5 font-extrabold"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  }

  // Logo file validation
  function validateLogoFile(file: File): string | null {
    const MAX_SIZE_MB = 2;
    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File must be under ${MAX_SIZE_MB} MB`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Allowed types: PNG, JPEG, WebP, SVG";
    }
    return null;
  }

  // Handle logo file selection for creation form
  function handleCreateLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateLogoFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setCreateLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCreateLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Handle logo file selection for edit form
  function handleEditLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateLogoFile(file);
    if (error) {
      setLogoUploadError(error);
      return;
    }

    setLogoUploadError(null);
    setEditLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setEditLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Remove logo from edit form
  async function handleRemoveLogo() {
    if (!editingSite || !canEditSites) return;
    
    setIsUploadingLogo(true);
    try {
      await removeSiteLogo(editingSite.id);
      invalidateCompanySites(activeCompanyId);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleCreateSite(data: SiteCreationFormData) {
    if (!activeCompanyId || !canEditSites) return;

    // Create optimistic site with temporary ID
    const tempId = `temp-${Date.now()}`;
    const slug = toSlug(data.name);
    const projectName = data.projectId ? projects.find(p => p.id === data.projectId)?.name ?? null : null;
    const timezone = data.timezone || "Australia/Sydney";

    const optimisticSite: Site = {
      id: tempId,
      company_id: activeCompanyId,
      project_id: data.projectId || null,
      name: data.name.trim(),
      slug,
      logo_url: null,
      is_active: true,
      timezone: timezone,
      created_at: new Date().toISOString(),
      // Optimistic indicator
      _optimistic: true,
    } as Site;

    // Get current sites for rollback
    const currentSites = queryClient.getQueryData<Site[]>(siteKeys.company(activeCompanyId)) ?? [];

    // Immediately add optimistic site to cache
    queryClient.setQueryData<Site[]>(siteKeys.company(activeCompanyId), (old) => {
      return [optimisticSite, ...(old ?? [])];
    });

    // Store logo file for upload after site creation
    const logoFileToUpload = createLogoFile;
    
    resetCreate();
    setCreateLogoFile(null);
    setCreateLogoPreview(null);
    setProjectLocked(false);
    setProjectPulse(false);

    try {
      const { data: insertedSite, error: insertError } = await supabase.from("sites").insert({
        company_id: activeCompanyId,
        name: data.name.trim(),
        slug,
        project_id: data.projectId || null,
        timezone: timezone,
      }).select("id").single();

      if (insertError) throw insertError;

      // Upload logo if provided
      if (logoFileToUpload && insertedSite?.id) {
        const result = await uploadSiteLogo(insertedSite.id, logoFileToUpload);
        if (!result.success) {
          toast.error(`Site created but logo upload failed: ${result.error}`);
        }
      }

      // Invalidate to get server-generated ID and full data
      invalidateCompanySites(activeCompanyId);
      setCreateSuccess({ siteName: data.name.trim(), projectName });
      toast.success("Site created.");
    } catch (err) {
      // Rollback: restore previous sites on error
      queryClient.setQueryData(siteKeys.company(activeCompanyId), currentSites);
      toast.error(err instanceof Error ? err.message : "Could not create site.");
    }
  }

  // Execute the actual move after debounce
  const executeMove = useCallback(async (siteId: string, newProjectId: string | null, previousProjectId: string | null) => {
    if (!canEditSites) return;
    setSavingSiteId(siteId);
    setMoveErrorSiteId(null);

    try {
      const { error: updateError } = await supabase
        .from("sites")
        .update({ project_id: newProjectId })
        .eq("id", siteId);
      if (updateError) throw updateError;

      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);

      const projectName = newProjectId
        ? projects.find(p => p.id === newProjectId)?.name ?? "Unassigned"
        : "Unassigned";

      // Show toast with undo option
      const toastId = toast.success(
        <div className="flex flex-col gap-2">
          <span>Moved to <strong>{projectName}</strong></span>
          <button
            onClick={() => undoMove(siteId, previousProjectId, toastId)}
            className="self-start text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
          >
            Undo
          </button>
        </div>,
        { duration: 5000 }
      );

      // Auto-dismiss undo option after 5 seconds
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        toast.dismiss(toastId);
      }, 5000);
    } catch (err) {
      setMoveErrorSiteId(siteId);
      toast.error(err instanceof Error ? err.message : "Could not assign site to project.");
      // Revert UI on error
      invalidateCompanySites(activeCompanyId);
    } finally {
      setSavingSiteId(null);
      setPendingMove(null);
    }
  }, [canEditSites, activeCompanyId, invalidateCompanySites, projects]);

  // Undo the move
  const undoMove = useCallback(async (siteId: string, previousProjectId: string | null, toastId: string | number) => {
    toast.dismiss(toastId);
    setSavingSiteId(siteId);

    try {
      const { error: updateError } = await supabase
        .from("sites")
        .update({ project_id: previousProjectId })
        .eq("id", siteId);
      if (updateError) throw updateError;

      invalidateCompanySites(activeCompanyId);
      toast.success("Move undone.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not undo move.");
    } finally {
      setSavingSiteId(null);
    }
  }, [activeCompanyId, invalidateCompanySites]);

  // Debounced move handler
  const handleAssignSiteToProject = useCallback((siteId: string, projectId: string | null) => {
    if (!canEditSites) return;

    // Clear any pending timeout
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    // Find the site and its current project
    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    const previousProjectId = site.project_id ?? null;
    const projectName = projectId
      ? projects.find(p => p.id === projectId)?.name ?? null
      : null;

    // Set pending state immediately for UI feedback
    setPendingMove({ siteId, projectId, projectName });

    // Debounce the actual save
    moveTimeoutRef.current = setTimeout(() => {
      executeMove(siteId, projectId, previousProjectId);
    }, 300);
  }, [canEditSites, sites, projects, executeMove]);

  async function handleSelectSite(siteId: string) {
    setSwitchingSiteId(siteId);
    try {
      await setActiveSite(siteId);
      await refresh();
      const siteName = sites.find(s => s.id === siteId)?.name ?? "Site";
      toast.success(`Now working on ${siteName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to set working site.");
    } finally {
      setSwitchingSiteId(null);
    }
  }

  function openEditModal(site: Site) {
    setEditingSite(site);
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setLogoUploadError(null);
    resetEdit({ name: site.name, timezone: site.timezone || "Australia/Sydney" });
  }

  async function handleSaveEdit(data: SiteEditFormData) {
    if (!editingSite || !canEditSites) return;

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const newSlug = toSlug(data.name);
      await updateSite(editingSite.id, {
        name: data.name.trim(),
        slug: newSlug,
        timezone: data.timezone || "Australia/Sydney",
      });

      // Upload new logo if selected
      if (editLogoFile) {
        const result = await uploadSiteLogo(editingSite.id, editLogoFile);
        if (!result.success) {
          setLogoUploadError(result.error);
          setIsUploadingLogo(false);
          return;
        }
      }

      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      setEditingSite(null);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      toast.success("Site updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update site.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleArchiveSite(site: Site) {
    if (!canEditSites) return;
    setArchivingSiteId(site.id);
    try {
      await updateSite(site.id, { is_active: false });
      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      toast.success("Site archived.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not archive site.");
    } finally {
      setArchivingSiteId(null);
      setConfirmArchiveSite(null);
    }
  }

  async function handleRestoreSite(siteId: string) {
    if (!canEditSites) return;
    try {
      await updateSite(siteId, { is_active: true });
      // Invalidate sites cache to trigger refetch
      invalidateCompanySites(activeCompanyId);
      toast.success("Site restored.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore site.");
    }
  }

  // Skeleton card component for loading state
  const SiteCardSkeleton = () => (
    <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-2xl shrink-0 bg-slate-200" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4 rounded bg-slate-200" />
          <Skeleton className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full shrink-0 bg-slate-200" />
      </div>
      <div className="mt-auto space-y-3">
        <Skeleton className="h-11 w-full rounded-xl bg-slate-200" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Skeleton className="h-11 w-11 rounded-xl bg-slate-200" />
            <Skeleton className="h-11 w-11 rounded-xl bg-slate-200" />
            <Skeleton className="h-11 w-11 rounded-xl bg-slate-200" />
          </div>
          <Skeleton className="h-11 w-20 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );

  // Initial workspace loading
  if (loading || !summary) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 px-6 md:px-10 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-8 w-32 rounded bg-slate-200" />
              <Skeleton className="h-4 w-48 rounded bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SiteCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error fallback when sites fail to load
  if (sitesError && !sitesLoading) {
    return (
      <SitesErrorFallback
        error={sitesError}
        onRetry={() => refetchSites()}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Sticky Header with Search */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200 px-6 md:px-10 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sites</h1>
            <p className="text-sm text-slate-500 font-medium">
              Physical locations with QR codes for SiteSign
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-9 pr-9 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  aria-label="Clear search"
                >
                  <div className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </button>
              )}
            </div>
            <Link
              href="/dashboard/team"
              className="hidden sm:block text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl border border-slate-200 bg-white transition-colors"
            >
              Manage Team
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-8">

      {/* Grouped View */}
      <div className="space-y-10">
        {/* No matches state */}
        {searchQuery.trim() && totalMatchingSites === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No sites match</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              No sites found matching &ldquo;<span className="font-semibold text-slate-700">{searchQuery}</span>&rdquo;.
              Try a different search term or{' '}
              <button
                onClick={() => setSearchQuery("")}
                className="text-amber-600 font-semibold hover:text-amber-700 underline"
              >
                clear the filter
              </button>.
            </p>
          </div>
        )}

        {/* Loading skeleton for sites */}
        {sitesLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <Skeleton className="h-9 w-9 rounded-lg bg-slate-200" />
              <Skeleton className="h-6 w-48 rounded bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SiteCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {groupedSites.map((group) => (
          <section key={group.projectId || "unassigned"} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${group.project ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                   </svg>
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {group.project ? group.project.name : "Unassigned Locations"}
                    </h2>
                    {group.project && <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Project Dashboard</p>}
                </div>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {group.sites.length} Site{group.sites.length !== 1 ? "s" : ""}
              </span>
            </div>

            {group.sites.length === 0 ? (
              canEditSites ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900">
                        {group.project ? "Add your first site to this project" : "Create your first site"}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {group.project
                          ? "Sites are physical locations with QR codes for sign-in."
                          : "Sites belong to projects and get QR codes for SiteSign."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="text"
                      placeholder={group.project ? "e.g., Building A" : "Site name..."}
                      value={quickAddValues[group.projectId || "unassigned"] || ""}
                      onChange={(e) => {
                        setQuickAddValues(prev => ({
                          ...prev,
                          [group.projectId || "unassigned"]: e.target.value
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && quickAddValues[group.projectId || "unassigned"]?.trim()) {
                          e.preventDefault();
                          const siteName = quickAddValues[group.projectId || "unassigned"].trim();
                          setCreateValue("name", siteName);
                          setCreateValue("projectId", group.projectId || "");
                          setProjectLocked(!!group.projectId);
                          setQuickAddValues(prev => ({ ...prev, [group.projectId || "unassigned"]: "" }));
                          createSiteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                          setTimeout(() => {
                            setProjectPulse(true);
                            setTimeout(() => setProjectPulse(false), 1200);
                          }, 400);
                        }
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                    />
                    <button
                      onClick={() => {
                        const siteName = quickAddValues[group.projectId || "unassigned"]?.trim() || "";
                        setCreateValue("name", siteName);
                        setCreateValue("projectId", group.projectId || "");
                        setProjectLocked(!!group.projectId);
                        setQuickAddValues(prev => ({ ...prev, [group.projectId || "unassigned"]: "" }));
                        createSiteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setTimeout(() => {
                          setProjectPulse(true);
                          setTimeout(() => setProjectPulse(false), 1200);
                        }, 400);
                      }}
                      disabled={!quickAddValues[group.projectId || "unassigned"]?.trim()}
                      className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 font-bold rounded-xl px-4 py-2.5 text-sm transition-all flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon="🏗️"
                  title={group.project ? "Add your first site to this project" : "Create your first site"}
                  description={group.project
                    ? "Sites are physical locations with QR codes for sign-in. Create a site to activate SiteSign."
                    : "Sites belong to projects and get QR codes for SiteSign. Create a project first if you haven't already."}
                  className="bg-white border-2 border-dashed border-slate-200 rounded-3xl"
                />
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.sites.map((site) => {
                  const isActive = site.id === activeSiteId;
                  const isArchived = site.is_active === false;
                  const isExpanded = expandedCards.has(site.id);
                  const hasCopied = copiedSlug === site.slug;
                  return (
                    <div
                        key={site.id}
                        className={`group relative bg-white border-2 rounded-3xl p-4 sm:p-5 transition-all duration-200 shadow-sm flex flex-col ${
                            isArchived
                            ? "border-slate-200 bg-slate-50/60 opacity-70"
                            : isActive
                            ? "border-amber-400 bg-amber-50/30 sm:scale-[1.02]"
                            : "border-slate-100 hover:border-slate-200 hover:shadow-md"
                        }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center ${isArchived ? "bg-slate-100 text-slate-300" : isActive ? "bg-amber-400 text-amber-950" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors"}`}>
                          {site.logo_url ? (
                            <img 
                              src={site.logo_url} 
                              alt={`${site.name} logo`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-extrabold leading-tight truncate ${isArchived ? "text-slate-400" : "text-slate-900"}`}>
                              <HighlightedSiteName name={site.name} query={searchQuery} />
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-slate-400 font-medium truncate">/{site.slug}</span>
                            <button
                              onClick={() => handleCopySlug(site.slug)}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
                              title={`Copy slug: ${site.slug}`}
                              aria-label={`Copy slug ${site.slug}`}
                            >
                              {hasCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {site.timezone && (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider" title={site.timezone}>
                              {getTimezoneShortCode(site.timezone)}
                            </span>
                          )}
                          {isArchived && (
                            <span className="bg-slate-200 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Archived</span>
                          )}
                          {isActive && !isArchived && (
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                          )}
                        </div>
                      </div>

                      {/* Primary Action */}
                      <div className="mt-auto">
                        {isArchived ? (
                          /* Archived site actions */
                          canEditSites && (
                            <button
                              onClick={() => handleRestoreSite(site.id)}
                              className="w-full text-sm font-bold py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all min-h-[44px]"
                            >
                              Restore Site
                            </button>
                          )
                        ) : (
                          /* Active site actions */
                          <>
                            {/* Main Action Bar */}
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    onClick={() => handleSelectSite(site.id)}
                                    disabled={switchingSiteId === site.id}
                                    className={`flex-1 text-sm font-bold py-3 rounded-xl transition-all min-h-[44px] ${
                                        isActive
                                        ? "bg-amber-400 text-amber-950 shadow-inner"
                                        : "bg-slate-900 text-white hover:bg-black shadow-sm"
                                    }`}
                                >
                                    {switchingSiteId === site.id ? "Setting..." : isActive ? "Working Site" : "Make Working"}
                                </button>
                            </div>

                            {/* Icon Action Bar - 44px touch targets */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Link
                                    href={`/print-qr/${site.slug}`}
                                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    title="Print QR Code"
                                    aria-label="Print QR Code"
                                >
                                    <QrCode className="h-5 w-5" />
                                </Link>
                                {canEditSites && (
                                  <>
                                    <button
                                      onClick={() => openEditModal(site)}
                                      className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      title="Edit site"
                                      aria-label="Edit site"
                                    >
                                      <Pencil className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => setConfirmArchiveSite(site)}
                                      disabled={archivingSiteId === site.id}
                                      className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 shadow-sm transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
                                      title="Archive site"
                                      aria-label="Archive site"
                                    >
                                      <Archive className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Expandable section toggle */}
                              <button
                                onClick={() => toggleCardExpanded(site.id)}
                                className="flex items-center gap-1 p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors min-h-[44px]"
                                aria-label={isExpanded ? "Collapse details" : "Expand details"}
                              >
                                <span className="text-xs font-medium hidden sm:inline">Details</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>

                            {/* Expandable Section - Project Move & Future Analytics */}
                            {isExpanded && canEditSites && (
                              <div className="mt-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                  {savingSiteId === site.id ? "Saving..." : "Project Assignment"}
                                </label>
                                <div className="relative">
                                  <select
                                      value={pendingMove?.siteId === site.id ? (pendingMove.projectId ?? "") : (site.project_id ?? "")}
                                      onChange={(e) => handleAssignSiteToProject(site.id, e.target.value || null)}
                                      disabled={savingSiteId === site.id}
                                      className={`w-full text-sm font-bold border rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:border-amber-400 transition-colors min-h-[44px] ${
                                        moveErrorSiteId === site.id
                                          ? "border-red-300 text-red-600 bg-red-50"
                                          : savingSiteId === site.id
                                          ? "border-amber-300 text-amber-700 bg-amber-50"
                                          : "border-slate-200 text-slate-600"
                                      }`}
                                  >
                                      <option value="">Unassigned</option>
                                      {projects.map((project) => (
                                      <option key={project.id} value={project.id}>
                                          {project.name}
                                      </option>
                                      ))}
                                  </select>
                                  {savingSiteId === site.id && (
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                      <div className="h-4 w-4 rounded-full border-2 border-amber-300 border-t-amber-500 animate-spin" />
                                    </div>
                                  )}
                                  {moveErrorSiteId === site.id && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                {moveErrorSiteId === site.id && (
                                  <p className="mt-1.5 text-xs text-red-500 font-medium">Move failed. Try again.</p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      <section ref={createSiteSectionRef} id="create-site-section" className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden scroll-mt-24">
        {/* Pattern decor */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="dotPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotPattern)" />
            </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight">Create a Site</h2>
            <p className="mt-2 text-slate-400 font-medium">
                Sites are physical work locations. Each site gets a unique QR code for SiteSign and becomes the hub for ITPs, diaries, and field records. Choose an active site to start working.
            </p>

            {!canEditSites ? (
            <div className="mt-6 bg-white/10 rounded-2xl p-4 text-sm text-slate-300 border border-white/5">
                Only Workspace Owner or Managers can add new sites.
            </div>
            ) : createSuccess ? (
              <div className="mt-8 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{createSuccess.siteName} is ready</p>
                    <p className="text-sm text-slate-400 mt-1">
                      {createSuccess.projectName ? `Added to ${createSuccess.projectName}. ` : ""}
                      Your site has a unique QR code for SiteSign.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <button
                        onClick={() => {
                          const newSite = sites.find(s => s.name === createSuccess.siteName);
                          if (newSite) window.open(`/print-qr/${newSite.slug}`, '_blank');
                        }}
                        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Print QR Code
                      </button>
                      <button
                        onClick={() => setCreateSuccess(null)}
                        className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
                      >
                        Create another site →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <form
                className={`mt-8 space-y-4 ${shakeForm ? "animate-shake" : ""}`}
                onSubmit={handleSubmitCreate(handleCreateSite, () => triggerShake())}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                            Site Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            {...registerCreate("name")}
                            placeholder="e.g. South End Stormwater"
                            className={`w-full bg-white/10 border-2 ${createErrors.name ? "border-red-400 focus:border-red-400" : "border-white/10 focus:border-amber-400"} outline-none rounded-2xl px-5 py-3.5 text-white placeholder-slate-500 transition-all font-medium`}
                            aria-invalid={createErrors.name ? "true" : "false"}
                        />
                        {createErrors.name && (
                            <div className="mt-2 ml-1 flex items-start gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-red-400 font-medium">{createErrors.name.message}</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ml-1 ${projectLocked ? "text-amber-400" : "text-slate-500"}`}>
                          Allocated Project
                          {projectLocked && (
                            <span className="ml-2 text-xs font-medium text-amber-400/80">(Locked)</span>
                          )}
                        </label>
                        <div className="relative">
                          <select
                            {...registerCreate("projectId")}
                            ref={projectSelectRef}
                            disabled={projectLocked}
                            onChange={(e) => {
                              registerCreate("projectId").onChange(e);
                              if (projectLocked) setProjectLocked(false);
                            }}
                            className={`w-full bg-white/10 outline-none rounded-2xl px-5 py-3.5 text-white appearance-none cursor-pointer transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
                              projectPulse || projectLocked
                                ? "border-2 border-amber-400 ring-2 ring-amber-400/30"
                                : "border border-white/10 focus:border-amber-400"
                            } ${projectPulse ? "animate-pulse" : ""}`}
                          >
                              <option value="" className="bg-slate-900 border-none">Unassigned Site</option>
                              {projects.map((project) => (
                                  <option key={project.id} value={project.id} className="bg-slate-900 border-none">
                                      {project.name}
                                  </option>
                              ))}
                          </select>
                          {projectLocked && (
                            <button
                              type="button"
                              onClick={() => setProjectLocked(false)}
                              className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                              title="Unlock project selection"
                            >
                              Change
                            </button>
                          )}
                        </div>
                        {projectLocked && (
                          <p className="mt-1.5 ml-1 text-xs text-amber-400/70">
                            Project pre-selected from group. Click &ldquo;Change&rdquo; to select a different project.
                          </p>
                        )}
                    </div>
                </div>

                {/* Logo Upload */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                        Site Logo
                    </label>
                    <input
                        ref={createFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleCreateLogoChange}
                        className="hidden"
                    />
                    <div className="flex items-center gap-4">
                        {createLogoPreview ? (
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border border-white/10">
                                    <img 
                                        src={createLogoPreview} 
                                        alt="Logo preview" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateLogoFile(null);
                                        setCreateLogoPreview(null);
                                        if (createFileInputRef.current) {
                                            createFileInputRef.current.value = "";
                                        }
                                    }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                    title="Remove logo"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => createFileInputRef.current?.click()}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 border-dashed rounded-2xl px-5 py-3.5 text-slate-400 hover:text-white transition-all"
                            >
                                <ImageIcon className="h-5 w-5" />
                                <span className="text-sm font-medium">Choose logo (optional)</span>
                            </button>
                        )}
                        <p className="text-xs text-slate-500">
                            PNG, JPG, WebP, or SVG. Max 2MB.
                        </p>
                    </div>
                </div>

                {/* Timezone selector */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                        Timezone
                        {createTimezone && (
                            <span className="ml-2 text-amber-400 font-medium">({getTimezoneShortCode(createTimezone)})</span>
                        )}
                    </label>
                    <select
                        {...registerCreate("timezone")}
                        className="w-full bg-white/10 border border-white/10 focus:border-amber-400 outline-none rounded-2xl px-5 py-3.5 text-white appearance-none cursor-pointer transition-all font-medium md:w-1/2"
                    >
                        <optgroup label="Australia - Eastern" className="bg-slate-900">
                            <option value="Australia/Sydney" className="bg-slate-900">Sydney (AEST/AEDT)</option>
                            <option value="Australia/Melbourne" className="bg-slate-900">Melbourne (AEST/AEDT)</option>
                            <option value="Australia/Brisbane" className="bg-slate-900">Brisbane (AEST)</option>
                            <option value="Australia/Canberra" className="bg-slate-900">Canberra (AEST/AEDT)</option>
                            <option value="Australia/Hobart" className="bg-slate-900">Hobart (AEST/AEDT)</option>
                        </optgroup>
                        <optgroup label="Australia - Central" className="bg-slate-900">
                            <option value="Australia/Adelaide" className="bg-slate-900">Adelaide (ACST/ACDT)</option>
                            <option value="Australia/Darwin" className="bg-slate-900">Darwin (ACST)</option>
                        </optgroup>
                        <optgroup label="Australia - Western" className="bg-slate-900">
                            <option value="Australia/Perth" className="bg-slate-900">Perth (AWST)</option>
                        </optgroup>
                        <optgroup label="New Zealand" className="bg-slate-900">
                            <option value="Pacific/Auckland" className="bg-slate-900">Auckland (NZST/NZDT)</option>
                            <option value="Pacific/Wellington" className="bg-slate-900">Wellington (NZST/NZDT)</option>
                            <option value="Pacific/Christchurch" className="bg-slate-900">Christchurch (NZST/NZDT)</option>
                        </optgroup>
                    </select>
                    <p className="mt-1.5 ml-1 text-xs text-slate-500">
                        Used for timestamps in SiteSign and all site records. Defaults to your browser timezone.
                    </p>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={() => {
                          resetCreate();
                          setProjectLocked(false);
                          setProjectPulse(false);
                        }}
                        className="mr-3 px-5 py-3.5 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={creating || !createIsValid}
                        className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-amber-950 font-black rounded-2xl px-8 py-3.5 text-sm transition-all shadow-lg shadow-amber-400/20"
                    >
                        {creating ? "Saving Site..." : "Create Site Record"}
                    </button>
                </div>
            </form>
            )}
        </div>
      </section>
      </div>

      {/* Edit Site Modal - Bottom Sheet on Mobile */}
      {editingSite && (
        <div 
          className={`fixed inset-0 z-50 flex ${isMobile ? "items-end" : "items-center justify-center"} bg-black/60 px-4 ${isMobile ? "pb-0" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingSite(null);
          }}
        >
          <div className={`bg-white shadow-2xl w-full ${isMobile ? "rounded-t-2xl max-w-none" : "rounded-2xl max-w-sm"} p-6 space-y-5 ${isMobile ? "animate-in slide-in-from-bottom duration-200" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Edit Site</h3>
                <p className="text-sm text-slate-500">A new URL slug will be generated.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitEdit(handleSaveEdit)} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Site Name</label>
                <input
                  type="text"
                  {...registerEdit("name")}
                  placeholder="e.g. North Pier Construction"
                  className={`w-full border-2 ${editErrors.name ? "border-red-300 focus:border-red-400" : "border-slate-100 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm font-bold focus:outline-none bg-slate-50 transition-colors text-slate-900 min-h-[44px]`}
                  autoFocus={!isMobile}
                />
                {editErrors.name && (
                  <p className="mt-1.5 text-xs text-red-500">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Timezone
                  {editTimezone && (
                    <span className="ml-2 text-amber-600 font-medium">({getTimezoneShortCode(editTimezone)})</span>
                  )}
                </label>
                <select
                  {...registerEdit("timezone")}
                  className="w-full border-2 border-slate-100 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none bg-slate-50 transition-colors text-slate-900 appearance-none cursor-pointer min-h-[44px]"
                >
                  <optgroup label="Australia - Eastern">
                    <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                    <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
                    <option value="Australia/Brisbane">Brisbane (AEST)</option>
                    <option value="Australia/Canberra">Canberra (AEST/AEDT)</option>
                    <option value="Australia/Hobart">Hobart (AEST/AEDT)</option>
                  </optgroup>
                  <optgroup label="Australia - Central">
                    <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                    <option value="Australia/Darwin">Darwin (ACST)</option>
                  </optgroup>
                  <optgroup label="Australia - Western">
                    <option value="Australia/Perth">Perth (AWST)</option>
                  </optgroup>
                  <optgroup label="New Zealand">
                    <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                    <option value="Pacific/Wellington">Wellington (NZST/NZDT)</option>
                    <option value="Pacific/Christchurch">Christchurch (NZST/NZDT)</option>
                  </optgroup>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Used for timestamps in SiteSign and all site records.
                </p>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Site Logo
                </label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleEditLogoChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  {(editLogoPreview || editingSite.logo_url) ? (
                    <>
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img 
                          src={editLogoPreview || editingSite.logo_url || ""} 
                          alt="Site logo" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          Change logo
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={isUploadingLogo}
                          className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove logo
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-xl px-4 py-2.5 text-slate-500 hover:text-slate-700 transition-all"
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Add logo</span>
                    </button>
                  )}
                </div>
                {logoUploadError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {logoUploadError}
                  </p>
                )}
                {isUploadingLogo && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </p>
                )}
              </div>

              <div className={`flex gap-3 pt-1 ${isMobile ? "flex-col" : ""}`}>
                <button
                  type="submit"
                  disabled={editSaving || !editIsValid || isUploadingLogo}
                  className="flex-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg transition-all active:scale-[0.98] min-h-[44px]"
                >
                  {editSaving || isUploadingLogo ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className={`${isMobile ? "w-full" : "px-4"} py-3 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] min-h-[44px]`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal - Bottom Sheet on Mobile */}
      {confirmArchiveSite && (
        <div 
          className={`fixed inset-0 z-50 flex ${isMobile ? "items-end" : "items-center justify-center"} bg-black/60 px-4 ${isMobile ? "pb-0" : ""}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmArchiveSite(null);
          }}
        >
          <div className={`bg-white shadow-2xl w-full ${isMobile ? "rounded-t-2xl max-w-none" : "rounded-2xl max-w-sm"} p-6 space-y-5 ${isMobile ? "animate-in slide-in-from-bottom duration-200" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-600 p-2 rounded-xl">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">Archive Site?</h3>
                <p className="text-sm text-slate-500">This will disable the public sign-in page.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              <span className="font-bold">{confirmArchiveSite.name}</span> will be marked as inactive. Existing visit records are preserved. You can restore it at any time.
            </p>

            <div className={`flex gap-3 ${isMobile ? "flex-col" : ""}`}>
              <button
                onClick={() => handleArchiveSite(confirmArchiveSite)}
                disabled={archivingSiteId === confirmArchiveSite.id}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg transition-all active:scale-[0.98] min-h-[44px]"
              >
                {archivingSiteId === confirmArchiveSite.id ? "Archiving..." : "Yes, Archive Site"}
              </button>
              <button
                onClick={() => setConfirmArchiveSite(null)}
                className={`${isMobile ? "w-full" : "px-4"} py-3 rounded-xl border-2 border-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] min-h-[44px]`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
