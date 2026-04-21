"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { loadSignatureCanvas, preloadSignatureCanvas } from "@/lib/dynamicImports";
import { getDocumentStandardProfile } from "@/lib/site-docs/standards";
import type { GeneratedContent, DocumentTemplate, ActionItem, Attendee, Signatory, DocumentSection, StructuredFieldValue, StructuredTableValue } from "@/lib/site-docs/types";
import { updateDocument } from "@/lib/site-docs/client";

type SignatureCanvasHandle = {
    clear: () => void;
    isEmpty: () => boolean;
    toDataURL: () => string;
};

type SignatureCanvasComponent = React.ComponentType<{
    ref?: React.Ref<SignatureCanvasHandle>;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
}>;

interface DocumentPreviewProps {
    content: GeneratedContent;
    template: DocumentTemplate;
    editable?: boolean;
    onChange?: (content: GeneratedContent) => void;
    documentId?: string;
    persistOnBlur?: boolean;
}

export function DocumentPreview({
    content,
    template,
    editable = false,
    onChange,
    documentId,
    persistOnBlur = true,
}: DocumentPreviewProps) {
    const { metadata, sections, actionItems, attendees, signatories, standards_basis, document_specific } = content;
    const standardProfile = getDocumentStandardProfile(template.id);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const [signingIndex, setSigningIndex] = useState<number | null>(null);
    const [SignatureCanvas, setSignatureCanvas] = useState<SignatureCanvasComponent | null>(null);
    const [isCanvasLoading, setIsCanvasLoading] = useState(false);
    const sigPadRef = useRef<SignatureCanvasHandle | null>(null);

    // Ref always holds the latest content so onBlur handlers don't capture a stale prop value
    const latestContent = useRef(content);
    latestContent.current = content;

    const handleChange = (newContent: GeneratedContent) => {
        latestContent.current = newContent;
        onChange?.(newContent);
    };

    const saveToServer = async () => {
        if (!documentId || !editable || !persistOnBlur) return;

        setSaveStatus("saving");
        try {
            await updateDocument(documentId, { generated_content: latestContent.current });
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (error) {
            console.error("Failed to save document:", error);
            setSaveStatus("idle");
        }
    };

    useEffect(() => {
        if (signingIndex === null || SignatureCanvas) return;
        setIsCanvasLoading(true);
        loadSignatureCanvas()
            .then((mod) => setSignatureCanvas(() => mod.default as SignatureCanvasComponent))
            .finally(() => setIsCanvasLoading(false));
    }, [signingIndex, SignatureCanvas]);

    const updateMetadata = (key: string, value: string) => {
        if (!editable) return;
        handleChange({
            ...content,
            metadata: { ...metadata, [key]: value }
        });
    };

    const updateSection = (index: number, field: "title" | "content" | "status", value: string) => {
        if (!editable) return;
        const newSections = [...sections];
        newSections[index] = { ...newSections[index], [field]: value };
        handleChange({ ...content, sections: newSections });
    };

    const updateActionItem = (index: number, field: keyof ActionItem, value: string) => {
        if (!editable || !actionItems) return;
        const newItems = [...actionItems];
        newItems[index] = { ...newItems[index], [field]: value };
        handleChange({ ...content, actionItems: newItems });
    };

    const updateAttendee = (index: number, field: keyof Attendee, value: string | boolean) => {
        if (!editable || !attendees) return;
        const newAttendees = [...attendees];
        newAttendees[index] = { ...newAttendees[index], [field]: value };
        handleChange({ ...content, attendees: newAttendees });
    };

    const updateSignatory = (index: number, field: keyof Signatory, value: string) => {
        if (!editable || !signatories) return;
        const newSigs = [...signatories];
        newSigs[index] = { ...newSigs[index], [field]: value };
        handleChange({ ...content, signatories: newSigs });
    };

    const updateStandardsBasis = (index: number, value: string) => {
        if (!editable) return;
        const current = [...(standards_basis || [])];
        current[index] = value;
        handleChange({ ...content, standards_basis: current });
    };

    const addStandardsBasis = () => {
        if (!editable) return;
        handleChange({ ...content, standards_basis: [...(standards_basis || []), ""] });
    };

    const removeStandardsBasis = (index: number) => {
        if (!editable) return;
        handleChange({ ...content, standards_basis: (standards_basis || []).filter((_, i) => i !== index) });
    };

    const updateDocumentSpecific = (key: string, value: unknown) => {
        if (!editable) return;
        handleChange({
            ...content,
            document_specific: {
                ...(document_specific || {}),
                [key]: value,
            },
        });
    };

    const renderDocumentSpecificField = (field: typeof standardProfile.specificFields[number]) => {
        const value = document_specific?.[field.key];

        if (field.kind === "text" || field.kind === "textarea") {
            const textValue = typeof value === "string" ? value : "";
            return editable ? (
                <textarea
                    value={textValue}
                    onChange={(e) => updateDocumentSpecific(field.key, e.target.value)}
                    onBlur={saveToServer}
                    className="w-full min-h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={field.helpText || field.label}
                />
            ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{textValue || "—"}</div>
            );
        }

        if (field.kind === "list") {
            const listValue = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
            return (
                <div className="space-y-2">
                    {listValue.map((item, index) => (
                        <div key={`${field.key}-${index}`} className="flex items-start gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {editable ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => {
                                            const next = [...listValue];
                                            next[index] = e.target.value;
                                            updateDocumentSpecific(field.key, next);
                                        }}
                                        onBlur={saveToServer}
                                        className="flex-1 border-b border-transparent bg-transparent py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                    />
                                    <button onClick={() => updateDocumentSpecific(field.key, listValue.filter((_, i) => i !== index))} className="text-xs text-red-500">✕</button>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-700">{item}</div>
                            )}
                        </div>
                    ))}
                    {editable && (
                        <button
                            onClick={() => updateDocumentSpecific(field.key, [...listValue, ""])}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            + Add item
                        </button>
                    )}
                    {!editable && listValue.length === 0 && <div className="text-sm text-slate-500">—</div>}
                </div>
            );
        }

        if (field.kind === "fields") {
            const fieldsValue = Array.isArray(value) ? value.filter((item): item is StructuredFieldValue => typeof item === "object" && item !== null && "label" in item && "value" in item) : [];
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fieldsValue.map((item, index) => (
                        <div key={`${field.key}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            {editable ? (
                                <>
                                    <input
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => {
                                            const next = [...fieldsValue];
                                            next[index] = { ...next[index], label: e.target.value };
                                            updateDocumentSpecific(field.key, next);
                                        }}
                                        onBlur={saveToServer}
                                        className="w-full bg-transparent text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={item.value}
                                        onChange={(e) => {
                                            const next = [...fieldsValue];
                                            next[index] = { ...next[index], value: e.target.value };
                                            updateDocumentSpecific(field.key, next);
                                        }}
                                        onBlur={saveToServer}
                                        className="mt-2 w-full bg-transparent text-sm text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                    />
                                </>
                            ) : (
                                <>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                                    <div className="mt-1 text-sm text-slate-800">{item.value || "—"}</div>
                                </>
                            )}
                        </div>
                    ))}
                    {editable && (
                        <button
                            onClick={() => updateDocumentSpecific(field.key, [...fieldsValue, { label: "New field", value: "" }])}
                            className="rounded-lg border border-dashed border-slate-300 p-3 text-sm font-medium text-blue-600 hover:border-blue-300 hover:bg-blue-50 text-left"
                        >
                            + Add field
                        </button>
                    )}
                </div>
            );
        }

        const tableValue = (value && typeof value === "object" && !Array.isArray(value) && "columns" in value && "rows" in value
            ? value
            : { columns: field.columns || [], rows: [] }) as StructuredTableValue;

        return (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            {tableValue.columns.map((column, columnIndex) => (
                                <th key={`${field.key}-col-${columnIndex}`} className="px-3 py-2 text-left font-medium text-slate-700">
                                    {editable ? (
                                        <input
                                            type="text"
                                            value={column}
                                            onChange={(e) => {
                                                const nextColumns = [...tableValue.columns];
                                                nextColumns[columnIndex] = e.target.value;
                                                updateDocumentSpecific(field.key, { ...tableValue, columns: nextColumns });
                                            }}
                                            onBlur={saveToServer}
                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                        />
                                    ) : column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {tableValue.rows.map((row, rowIndex) => (
                            <tr key={`${field.key}-row-${rowIndex}`}>
                                {tableValue.columns.map((_, columnIndex) => (
                                    <td key={`${field.key}-cell-${rowIndex}-${columnIndex}`} className="px-3 py-2 text-slate-700">
                                        {editable ? (
                                            <input
                                                type="text"
                                                value={row[columnIndex] || ""}
                                                onChange={(e) => {
                                                    const nextRows = tableValue.rows.map((existingRow, existingRowIndex) =>
                                                        existingRowIndex === rowIndex
                                                            ? tableValue.columns.map((__, idx) => (idx === columnIndex ? e.target.value : existingRow[idx] || ""))
                                                            : existingRow
                                                    );
                                                    updateDocumentSpecific(field.key, { ...tableValue, rows: nextRows });
                                                }}
                                                onBlur={saveToServer}
                                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                            />
                                        ) : (row[columnIndex] || "—")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {editable && (
                            <tr>
                                <td colSpan={Math.max(tableValue.columns.length, 1)} className="px-3 py-2">
                                    <button
                                        onClick={() => updateDocumentSpecific(field.key, {
                                            ...tableValue,
                                            rows: [...tableValue.rows, tableValue.columns.map(() => "")],
                                        })}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        + Add row
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const handleApplySignature = async () => {
        if (!editable || !signatories || signingIndex === null || !sigPadRef.current || sigPadRef.current.isEmpty()) return;
        const signatureData = sigPadRef.current.toDataURL();
        const newSigs = [...signatories];
        newSigs[signingIndex] = {
            ...newSigs[signingIndex],
            signature_data: signatureData,
            signature_date: new Date().toISOString().slice(0, 10),
        };
        handleChange({ ...content, signatories: newSigs });
        await saveToServer();
        setSigningIndex(null);
    };

    const addSection = () => {
        if (!editable) return;
        const newSection: DocumentSection = {
            id: `section-${Date.now()}`,
            title: "New Section",
            content: "",
            order: sections.length,
            status: "open"
        };
        handleChange({ ...content, sections: [...sections, newSection] });
    };

    const removeSection = (index: number) => {
        if (!editable) return;
        const newSections = sections.filter((_, i) => i !== index);
        handleChange({ ...content, sections: newSections });
    };

    const addActionItem = () => {
        if (!editable) return;
        const newItem = {
            id: `action-${Date.now()}`,
            number: (actionItems?.length || 0) + 1,
            description: "",
            responsible: "",
            due_date: "",
            status: "open" as const
        };
        handleChange({ ...content, actionItems: [...(actionItems || []), newItem] });
    };

    const removeActionItem = (index: number) => {
        if (!editable || !actionItems) return;
        const newItems = actionItems.filter((_, i) => i !== index);
        handleChange({ ...content, actionItems: newItems });
    };

    const addAttendee = () => {
        if (!editable) return;
        const newAttendee = {
            id: `attendee-${Date.now()}`,
            name: "",
            organization: "",
            role: "",
            present: false
        };
        handleChange({ ...content, attendees: [...(attendees || []), newAttendee] });
    };

    const removeAttendee = (index: number) => {
        if (!editable || !attendees) return;
        const newAttendees = attendees.filter((_, i) => i !== index);
        handleChange({ ...content, attendees: newAttendees });
    };

    const addSignatory = () => {
        if (!editable) return;
        const newSignatory = {
            id: `signatory-${Date.now()}`,
            name: "",
            organization: "",
            signature_date: ""
        };
        handleChange({ ...content, signatories: [...(signatories || []), newSignatory] });
    };

    const removeSignatory = (index: number) => {
        if (!editable || !signatories) return;
        const newSignatories = signatories.filter((_, i) => i !== index);
        handleChange({ ...content, signatories: newSignatories });
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Document Header */}
            <div className="p-4 sm:p-8 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className={editable ? "flex-1" : ""}>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{template.name}</p>
                        {editable ? (
                            <input
                                type="text"
                                value={metadata.document_title}
                                onChange={(e) => updateMetadata("document_title", e.target.value)}
                                onBlur={saveToServer}
                                className="w-full text-2xl font-bold text-slate-900 mt-1 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                placeholder="Document Title"
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-slate-900 mt-1">{metadata.document_title}</h2>
                        )}
                    </div>
                    <div className={`sm:text-right ${editable ? "sm:ml-4" : ""}`}>
                        {editable && persistOnBlur && (
                            <div className="mb-2 text-sm">
                                {saveStatus === "saving" && (
                                    <span className="text-slate-500">Saving...</span>
                                )}
                                {saveStatus === "saved" && (
                                    <span className="text-emerald-600 font-medium">Saved ✓</span>
                                )}
                            </div>
                        )}
                        {editable ? (
                            <>
                                <input
                                    type="text"
                                    value={metadata.reference || ""}
                                    onChange={(e) => updateMetadata("reference", e.target.value)}
                                    onBlur={saveToServer}
                                    className="text-sm font-medium text-slate-700 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent text-right block"
                                    placeholder="Reference"
                                />
                                <input
                                    type="date"
                                    value={metadata.date || ""}
                                    onChange={(e) => updateMetadata("date", e.target.value)}
                                    onBlur={saveToServer}
                                    className="text-sm text-slate-500 mt-1 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent block text-right"
                                />
                            </>
                        ) : (
                            <>
                                {metadata.reference && (
                                    <p className="text-sm font-medium text-slate-700">{metadata.reference}</p>
                                )}
                                {metadata.date && (
                                    <p className="text-sm text-slate-500">{new Date(metadata.date).toLocaleDateString()}</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {editable ? (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Project:</span>
                                <input
                                    type="text"
                                    value={metadata.project_name || ""}
                                    onChange={(e) => updateMetadata("project_name", e.target.value)}
                                    onBlur={saveToServer}
                                    className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                    placeholder="Project name"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Client:</span>
                                <input
                                    type="text"
                                    value={metadata.client || ""}
                                    onChange={(e) => updateMetadata("client", e.target.value)}
                                    onBlur={saveToServer}
                                    className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                    placeholder="Client"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Location:</span>
                                <input
                                    type="text"
                                    value={metadata.location || ""}
                                    onChange={(e) => updateMetadata("location", e.target.value)}
                                    onBlur={saveToServer}
                                    className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                    placeholder="Location"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Prepared by:</span>
                                <input
                                    type="text"
                                    value={metadata.prepared_by || ""}
                                    onChange={(e) => updateMetadata("prepared_by", e.target.value)}
                                    onBlur={saveToServer}
                                    className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                    placeholder="Name"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Organization:</span>
                                <input
                                    type="text"
                                    value={metadata.organization || ""}
                                    onChange={(e) => updateMetadata("organization", e.target.value)}
                                    onBlur={saveToServer}
                                    className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                    placeholder="Organization"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {metadata.project_name && (
                                <div>
                                    <span className="text-slate-500">Project:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.project_name}</span>
                                </div>
                            )}
                            {metadata.client && (
                                <div>
                                    <span className="text-slate-500">Client:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.client}</span>
                                </div>
                            )}
                            {metadata.location && (
                                <div>
                                    <span className="text-slate-500">Location:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.location}</span>
                                </div>
                            )}
                            {metadata.prepared_by && (
                                <div>
                                    <span className="text-slate-500">Prepared by:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.prepared_by}</span>
                                </div>
                            )}
                            {metadata.organization && (
                                <div>
                                    <span className="text-slate-500">Organization:</span>
                                    <span className="ml-2 font-medium text-slate-900">{metadata.organization}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {standardProfile.metadataFields.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {standardProfile.metadataFields.map((field) => (
                            <div key={field.key} className="flex items-center gap-2">
                                <span className="text-slate-500">{field.label}:</span>
                                {editable ? (
                                    <input
                                        type={field.type === "date" ? "date" : "text"}
                                        value={(metadata[field.key as keyof typeof metadata] as string) || ""}
                                        onChange={(e) => updateMetadata(field.key, e.target.value)}
                                        onBlur={saveToServer}
                                        className="flex-1 font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                    />
                                ) : (
                                    <span className="font-medium text-slate-900">{(metadata[field.key as keyof typeof metadata] as string) || "—"}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Standards Basis */}
            {((standards_basis && standards_basis.length > 0) || editable) && (
                <div className="p-4 sm:p-8 border-b border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">Standards & Requirements Basis</h3>
                            <p className="text-sm text-slate-500 mt-1">Industry, council, and Australian practice assumptions used to structure this document.</p>
                        </div>
                        {editable && (
                            <button onClick={addStandardsBasis} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add basis</button>
                        )}
                    </div>
                    <div className="space-y-2">
                        {(standards_basis || []).map((item, index) => (
                            <div key={`standard-${index}`} className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                                {editable ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => updateStandardsBasis(index, e.target.value)}
                                            onBlur={saveToServer}
                                            className="flex-1 bg-transparent border-b border-transparent py-1 text-sm text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                                        />
                                        <button onClick={() => removeStandardsBasis(index)} className="text-xs text-red-500">✕</button>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-700">{item}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Document-Specific Structured Fields */}
            {standardProfile.specificFields.length > 0 && (
                <div className="p-4 sm:p-8 border-b border-slate-200">
                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-900">{template.name} Structured Fields</h3>
                        <p className="text-sm text-slate-500 mt-1">Purpose-built fields for this document type.</p>
                    </div>
                    <div className="space-y-6">
                        {standardProfile.specificFields.map((field) => (
                            <div key={field.key}>
                                <div className="mb-2">
                                    <h4 className="font-medium text-slate-900">{field.label}</h4>
                                    {field.helpText && <p className="text-sm text-slate-500 mt-1">{field.helpText}</p>}
                                </div>
                                {renderDocumentSpecificField(field)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attendees */}
            {((attendees && attendees.length > 0) || editable) && (
                <div className="p-4 sm:p-8 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Attendees</h3>
                        {editable && (
                            <button
                                onClick={addAttendee}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                + Add Attendee
                            </button>
                        )}
                    </div>
                    {attendees && attendees.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Organization</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Role</th>
                                        <th className="px-4 py-2 text-center font-medium text-slate-700">Present</th>
                                        {editable && <th className="px-4 py-2 text-center font-medium text-slate-700"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {attendees.map((attendee, idx) => (
                                        <tr key={attendee.id}>
                                            {editable ? (
                                                <>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={attendee.name}
                                                            onChange={(e) => updateAttendee(idx, "name", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Name"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={attendee.organization || ""}
                                                            onChange={(e) => updateAttendee(idx, "organization", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Organization"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={attendee.role || ""}
                                                            onChange={(e) => updateAttendee(idx, "role", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Role"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={attendee.present}
                                                            onChange={(e) => { updateAttendee(idx, "present", e.target.checked); saveToServer(); }}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button
                                                            onClick={() => removeAttendee(idx)}
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-2 font-medium text-slate-900">{attendee.name}</td>
                                                    <td className="px-4 py-2 text-slate-600">{attendee.organization || "—"}</td>
                                                    <td className="px-4 py-2 text-slate-600">{attendee.role || "—"}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        {attendee.present ? (
                                                            <span className="text-emerald-600">✓</span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Sections */}
            <div className="p-4 sm:p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Sections</h3>
                    {editable && (
                        <button
                            onClick={addSection}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            + Add Section
                        </button>
                    )}
                </div>
                {sections.map((section, idx) => (
                    <div key={section.id} className={editable ? "border border-slate-200 rounded-lg p-4" : ""}>
                        <div className="flex items-center gap-2 mb-2">
                            {editable ? (
                                <>
                                    <input
                                        type="text"
                                        value={section.title}
                                        onChange={(e) => updateSection(idx, "title", e.target.value)}
                                        onBlur={saveToServer}
                                        className="flex-1 font-semibold text-slate-900 border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                        placeholder="Section Title"
                                    />
                                    <select
                                        value={section.status || ""}
                                        onChange={(e) => updateSection(idx, "status", e.target.value)}
                                        onBlur={saveToServer}
                                        className="text-xs font-medium rounded-full border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">No Status</option>
                                        <option value="open">Open</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                    <button
                                        onClick={() => removeSection(idx)}
                                        className="text-red-500 hover:text-red-700 text-sm px-2"
                                    >
                                        ✕
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-semibold text-slate-900">{section.title}</h3>
                                    {section.status && (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                            section.status === "open" ? "bg-amber-100 text-amber-700" :
                                            section.status === "closed" ? "bg-emerald-100 text-emerald-700" :
                                            section.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                                            "bg-slate-100 text-slate-600"
                                        }`}>
                                            {section.status}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        {editable ? (
                            <textarea
                                value={section.content}
                                onChange={(e) => updateSection(idx, "content", e.target.value)}
                                onBlur={saveToServer}
                                className="w-full h-32 px-3 py-2 text-slate-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Section content..."
                            />
                        ) : (
                            <div className="text-slate-700 whitespace-pre-wrap">{section.content}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Items */}
            {((actionItems && actionItems.length > 0) || editable) && (
                <div className="p-4 sm:p-8 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900">Action Items</h3>
                        {editable && (
                            <button
                                onClick={addActionItem}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                + Add Action Item
                            </button>
                        )}
                    </div>
                    {actionItems && actionItems.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700 w-12">#</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Action</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Responsible</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Due</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                                        {editable && <th className="px-4 py-2 text-center font-medium text-slate-700"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {actionItems.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 font-medium text-slate-900">{item.number}</td>
                                            {editable ? (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.description}
                                                            onChange={(e) => updateActionItem(idx, "description", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-700 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Action description"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.responsible || ""}
                                                            onChange={(e) => updateActionItem(idx, "responsible", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Responsible person"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="date"
                                                            value={item.due_date || ""}
                                                            onChange={(e) => updateActionItem(idx, "due_date", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-600 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={item.status}
                                                            onChange={(e) => updateActionItem(idx, "status", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="text-xs font-medium rounded-full border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="open">Open</option>
                                                            <option value="in-progress">In Progress</option>
                                                            <option value="closed">Closed</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeActionItem(idx)}
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 text-slate-700">{item.description}</td>
                                                    <td className="px-4 py-3 text-slate-600">{item.responsible || "—"}</td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                            item.status === "open" ? "bg-amber-100 text-amber-700" :
                                                            item.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                                                            "bg-emerald-100 text-emerald-700"
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Sign-off */}
            {((signatories && signatories.length > 0) || editable) && (
                <div className="p-4 sm:p-8 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-900 mb-4">Confirmation & Sign-off</h3>
                        {editable && (
                            <button
                                onClick={addSignatory}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                + Add Signatory
                            </button>
                        )}
                    </div>
                    {signatories && signatories.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Organization</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Signature</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Date</th>
                                        <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                                        {editable && <th className="px-4 py-2 text-center font-medium text-slate-700"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {signatories.map((sig, idx) => (
                                        <tr key={sig.id}>
                                            {editable ? (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={sig.name}
                                                            onChange={(e) => updateSignatory(idx, "name", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Name"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={sig.organization || ""}
                                                            onChange={(e) => updateSignatory(idx, "organization", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-600 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                            placeholder="Organization"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-start gap-2">
                                                            <span className="text-slate-400 italic">
                                                                {sig.signature_data ? "Signature captured" : "_________________"}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onMouseEnter={preloadSignatureCanvas}
                                                                onClick={() => setSigningIndex(idx)}
                                                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                                            >
                                                                {sig.signature_data ? "Re-sign" : "Click to sign"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="date"
                                                            value={sig.signature_date || ""}
                                                            onChange={(e) => updateSignatory(idx, "signature_date", e.target.value)}
                                                            onBlur={saveToServer}
                                                            className="w-full text-slate-400 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{sig.signature_date ? "Signed" : "Pending"}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeSignatory(idx)}
                                                            className="text-red-500 hover:text-red-700 text-sm"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{sig.name}</td>
                                                    <td className="px-4 py-3 text-slate-600">{sig.organization || "—"}</td>
                                                    <td className="px-4 py-3 text-slate-400 italic">
                                                        {sig.signature_data ? (
                                                            <Image src={sig.signature_data} alt="Signature" width={120} height={40} unoptimized className="h-10 w-auto object-contain" />
                                                        ) : "_________________"}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{sig.signature_date ? new Date(sig.signature_date).toLocaleDateString() : "____/____/______"}</td>
                                                    <td className="px-4 py-3 text-slate-600">{sig.signature_date ? "Signed" : "Pending"}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {template.id === "meeting-minutes" && (
                        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                            If no objection or requested amendment is raised within 48 hours of issue, these minutes will be considered accepted.
                        </div>
                    )}
                </div>
            )}

            {editable && signingIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h4 className="text-base font-semibold text-slate-900">Add signature</h4>
                                <p className="text-sm text-slate-500">Draw a signature for {signatories?.[signingIndex]?.name || 'signatory'}.</p>
                            </div>
                            <button type="button" onClick={() => setSigningIndex(null)} className="text-slate-500 hover:text-slate-700">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
                                {isCanvasLoading || !SignatureCanvas ? (
                                    <div className="flex h-44 items-center justify-center text-sm text-slate-500">Loading signature pad…</div>
                                ) : (
                                    <SignatureCanvas
                                        ref={sigPadRef}
                                        canvasProps={{ className: "h-44 w-full bg-white" }}
                                    />
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => sigPadRef.current?.clear()} className="text-sm font-medium text-slate-600 hover:text-slate-800">Clear</button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setSigningIndex(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                                    <button type="button" onClick={handleApplySignature} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Apply signature</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
