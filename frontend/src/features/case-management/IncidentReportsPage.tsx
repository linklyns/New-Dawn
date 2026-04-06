import { PageHeader } from '../../components/layout/PageHeader';

export function IncidentReportsPage() {
  return (
    <div>
      <PageHeader title="Incident Reports" subtitle="Log and track incident reports" />
      <div className="rounded-xl border border-slate-navy/10 bg-sage-green/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Incident Reports &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
