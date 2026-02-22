export default function SignOutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gray-800 text-white rounded-lg p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Sign Out of Site</h1>
            <p className="text-xs text-gray-500">Confirm your departure</p>
          </div>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Jane Smith"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="company">
              Company
            </label>
            <input
              id="company"
              type="text"
              placeholder="e.g. Acme Constructions"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="notes">
              Departure Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any incidents, hazards, or notes to report..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow"
          >
            Sign Out of Site
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          <a href="/" className="hover:underline text-gray-500">← Back to home</a>
        </p>
      </div>
    </div>
  );
}
