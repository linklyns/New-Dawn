import { PageHeader } from '../../components/layout/PageHeader';

export function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader title="Welcome To New Dawn" subtitle="A Path to Healing and Hope" />
      <div className="rounded-xl border border-slate-navy/10 bg-coral-pink/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Landing Page &mdash; Coming In Phase 4</p>
      </div>
    </div>
  );
}
