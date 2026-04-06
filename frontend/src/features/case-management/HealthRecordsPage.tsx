import { PageHeader } from '../../components/layout/PageHeader';

export function HealthRecordsPage() {
  return (
    <div>
      <PageHeader title="Health Records" subtitle="Track health and wellbeing metrics" />
      <div className="rounded-xl border border-slate-navy/10 bg-sage-green/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Health Records &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
