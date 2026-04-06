import { PageHeader } from '../../components/layout/PageHeader';

export function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of New Dawn operations" />
      <div className="rounded-xl border border-slate-navy/10 bg-golden-honey/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Admin Dashboard &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
