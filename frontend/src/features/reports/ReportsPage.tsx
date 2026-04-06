import { PageHeader } from '../../components/layout/PageHeader';

export function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and reporting dashboard" />
      <div className="rounded-xl border border-slate-navy/10 bg-coral-pink/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Reports &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
