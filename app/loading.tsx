export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="page-shell loading-state">
      <span aria-hidden="true" className="loading-mark">
        ✳
      </span>
      <p>Finding the right film…</p>
    </main>
  );
}
