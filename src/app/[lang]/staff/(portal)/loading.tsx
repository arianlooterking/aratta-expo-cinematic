export default function PortalLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6" aria-busy="true">
      <div className="h-16 w-2/3 animate-pulse rounded-xl bg-p-sunken" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-p-sunken" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-p-sunken" />
    </div>
  );
}
