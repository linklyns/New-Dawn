import { PageHeader } from '../../components/layout/PageHeader';

export function ImpactDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader title="Public Impact Dashboard" subtitle="See the difference New Dawn is making" />
      <div className="rounded-xl border border-slate-navy/10 bg-sky-blue/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Impact Dashboard &mdash; Coming In Phase 4</p>
      </div>
    </div>
  );
}
