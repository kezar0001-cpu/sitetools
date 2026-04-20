"use client";

import { UseFormRegister, FieldErrors, Control, Controller } from "react-hook-form";
import { visitorTypes, type VisitEntryFormData } from "@/lib/validation/schemas";
import { CompanyAutocomplete } from "@/components/forms";

interface ManualEntryFormProps {
  siteId: string;
  register: UseFormRegister<VisitEntryFormData>;
  control: Control<VisitEntryFormData>;
  errors: FieldErrors<VisitEntryFormData>;
  isValid: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  approvedCompanies?: string[];
}

export function ManualEntryForm({
  siteId,
  register,
  control,
  errors,
  isValid,
  isSubmitting,
  onSubmit,
  approvedCompanies,
}: ManualEntryFormProps) {
  return (
    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-bold text-slate-700">Manual Sign-In Entry</h2>
        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Admin</span>
      </div>
      <form className="grid grid-cols-1 md:grid-cols-6 gap-3" onSubmit={onSubmit}>
        <div>
          <input
            {...register("fullName")}
            placeholder="Full name"
            className={`w-full border-2 ${errors.fullName ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
          )}
        </div>
        <div>
          <input
            {...register("phoneNumber")}
            placeholder="Mobile (optional)"
            className={`w-full border-2 ${errors.phoneNumber ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.phoneNumber.message}</p>
          )}
        </div>
        <div>
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <CompanyAutocomplete
                siteId={siteId}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                approvedCompanies={approvedCompanies}
                placeholder="Employer / company"
                error={!!errors.companyName}
              />
            )}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>
          )}
        </div>
        <div>
          <select
            {...register("visitorType")}
            className={`w-full border-2 ${errors.visitorType ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors bg-white`}
          >
            {visitorTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.visitorType && (
            <p className="mt-1 text-xs text-red-500">{errors.visitorType.message}</p>
          )}
        </div>
        <div>
          <input
            type="datetime-local"
            {...register("signedInAt")}
            className={`w-full border-2 ${errors.signedInAt ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-amber-400"} rounded-xl px-4 py-3 text-sm outline-none transition-colors`}
            title="Signed in time (optional, defaults to now)"
          />
          {errors.signedInAt && (
            <p className="mt-1 text-xs text-red-500">{errors.signedInAt.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-amber-900 font-bold rounded-xl px-4 py-3 text-sm"
        >
          {isSubmitting ? "Adding..." : "Add Record"}
        </button>
      </form>
      <div className="mt-3 max-w-sm">
        <input
          type="datetime-local"
          {...register("signedOutAt")}
          className={`w-full border ${errors.signedOutAt ? "border-red-300 focus:border-red-400" : "border-slate-300 focus:border-amber-400"} rounded-xl px-4 py-2.5 text-sm outline-none transition-colors`}
          title="Signed out time (optional)"
        />
        {errors.signedOutAt && (
          <p className="mt-1 text-xs text-red-500">{errors.signedOutAt.message}</p>
        )}
      </div>
    </section>
  );
}
