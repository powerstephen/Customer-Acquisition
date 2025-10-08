export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Customer Acquisition Velocity</h1>
        <p className="text-gray-600">This app lives at <code className="px-1 py-0.5 bg-gray-100 rounded">/cav</code>.</p>
        <a
          href="/cav"
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
        >
          Open /cav
        </a>
      </div>
    </main>
  );
}
