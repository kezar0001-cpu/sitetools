"use client";

import { useEffect, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignSiteDocClient({
  documentId,
  signatoryId,
  token,
}: {
  documentId: string
  signatoryId: string
  token: string
}) {
  const sigPadRef = useRef<SignatureCanvas>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('')
  const [signatoryName, setSignatoryName] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [acceptanceClause, setAcceptanceClause] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/site-docs/sign/${documentId}/${signatoryId}?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Unable to load signing page')
        setDocumentTitle(data.documentTitle)
        setSignatoryName(data.signatory?.name || '')
        setOrganisation(data.signatory?.organization || '')
        setAcceptanceClause(data.acceptanceClause)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load signing page')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [documentId, signatoryId, token])

  async function handleSubmit() {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      setError('Please add your signature before submitting.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const signature = sigPadRef.current.toDataURL('image/png')
      const res = await fetch(`/api/site-docs/sign/${documentId}/${signatoryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signature }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save signature')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading sign-off page…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : success ? (
          <div className="space-y-4 py-10 text-center">
            <div className="text-4xl">✅</div>
            <h1 className="text-2xl font-bold text-slate-900">Document signed</h1>
            <p className="text-slate-600">Thank you, {signatoryName}. Your sign-off has been recorded.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">SiteDocs sign-off</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{documentTitle}</h1>
              <p className="mt-2 text-sm text-slate-600">
                Signing as <span className="font-semibold text-slate-900">{signatoryName}</span>
                {organisation ? ` · ${organisation}` : ''}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {acceptanceClause}
            </div>

            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3">
              <SignatureCanvas
                ref={sigPadRef}
                canvasProps={{ className: 'h-52 w-full rounded-xl bg-white' }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => sigPadRef.current?.clear()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Sign document'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}