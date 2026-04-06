import { PageHeader } from '../../components/layout/PageHeader';

export function InterventionPlansPage() {
  return (
    <div>
      <PageHeader title="Intervention Plans" subtitle="Manage intervention plans and services" />
      <div className="rounded-xl border border-slate-navy/10 bg-sage-green/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Intervention Plans &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
