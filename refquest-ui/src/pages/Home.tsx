/**
 * Phase 5A: Home Page (Placeholder)
 *
 * Landing page with recent games and quick actions
 */
export function Home() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">RefQuest AI Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Games</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Placeholder data</p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Events Detected</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Placeholder data</p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clips Generated</h3>
            <p className="text-3xl font-bold text-primary-600">0</p>
            <p className="text-sm text-gray-500 mt-1">Placeholder data</p>
          </div>
        </div>

        <div className="mt-8 card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Games</h2>
          <p className="text-gray-600">
            Phase 5A provides the core infrastructure. Full dashboard features will be implemented in Phase 5B-5E.
          </p>
        </div>
      </div>
    </div>
  );
}
