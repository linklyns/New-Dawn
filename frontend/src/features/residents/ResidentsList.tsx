import { PageHeader } from '../../components/layout/PageHeader';

export function ResidentsList() {
  return (
    <div>
      <PageHeader title="Residents" subtitle="Manage resident caseload inventory" />
      <div className="rounded-xl border border-slate-navy/10 bg-sky-blue/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Residents List &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
