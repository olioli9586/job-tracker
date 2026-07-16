import JobTracker from './components/JobTracker';

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <JobTracker />
    </main>
  );
}
