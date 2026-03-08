"use client";

import { useMemo, useState } from "react";
import { getFreeToolBySlug } from "@/lib/free-tools/catalog";

interface ToolCalculatorProps {
    toolSlug: string;
}

const formatValue = (value: number, precision = 2) => {
    if (!Number.isFinite(value)) {
        return "-";
    }

    return new Intl.NumberFormat("en-AU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
    }).format(value);
};

export function ToolCalculator({ toolSlug }: ToolCalculatorProps) {
    const calculator = getFreeToolBySlug(toolSlug)?.calculator;
    const [values, setValues] = useState<Record<string, string>>(() => {
        const seed: Record<string, string> = {};
        (calculator?.inputs ?? []).forEach((input) => {
            if (input.type === "select") {
                seed[input.id] = input.options?.[0]?.value ?? "";
                return;
            }

            seed[input.id] = "";
        });

        return seed;
    });

    const [attempted, setAttempted] = useState(false);

    const missingFields = useMemo(
        () => (calculator?.inputs ?? []).filter((input) => input.required && !values[input.id]?.toString().trim()).map((input) => input.label),
        [calculator?.inputs, values],
    );

    const canCalculate = missingFields.length === 0;
    const results = canCalculate && calculator ? calculator.compute(values) : [];

    if (!calculator) {
        return null;
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Calculator inputs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {calculator.inputs.map((input) => (
                        <label key={input.id} className="space-y-1.5 text-sm font-semibold text-slate-700">
                            <span>{input.label}</span>
                            {input.type === "select" ? (
                                <select
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white"
                                    value={values[input.id] ?? ""}
                                    onChange={(event) => setValues((prev) => ({ ...prev, [input.id]: event.target.value }))}
                                >
                                    {input.options?.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="flex rounded-xl border border-slate-300 overflow-hidden">
                                    <input
                                        type="number"
                                        min={input.min}
                                        step={input.step ?? 0.01}
                                        placeholder={input.placeholder}
                                        className="w-full px-3 py-2.5 text-sm outline-none"
                                        value={values[input.id] ?? ""}
                                        onChange={(event) => setValues((prev) => ({ ...prev, [input.id]: event.target.value }))}
                                    />
                                    {input.unit ? <span className="px-3 py-2.5 text-xs font-bold text-slate-500 bg-slate-50 border-l border-slate-300">{input.unit}</span> : null}
                                </div>
                            )}
                        </label>
                    ))}
                </div>

                <button
                    type="button"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-black transition-colors"
                    onClick={() => setAttempted(true)}
                >
                    Calculate
                </button>

                {attempted && !canCalculate ? (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        Enter values for: {missingFields.join(", ")}
                    </p>
                ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 sm:p-6 text-white space-y-3">
                <h2 className="text-lg font-bold">Results</h2>
                {canCalculate ? (
                    <div className="space-y-2">
                        {results.map((result) => (
                            <div key={result.id} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 flex items-center justify-between gap-2">
                                <span className="text-sm text-slate-200">{result.label}</span>
                                <span className="text-base font-black">
                                    {formatValue(result.value, result.precision)} {result.unit ?? ""}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-300">Add your inputs and run the calculator to see results.</p>
                )}
            </section>
        </div>
    );
}
