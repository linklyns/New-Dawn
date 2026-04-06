import { PageHeader } from '../../components/layout/PageHeader';

export function HomeVisitationsPage() {
  return (
    <div>
      <PageHeader title="Home Visitations" subtitle="Track home visit records" />
      <div className="rounded-xl border border-slate-navy/10 bg-sage-green/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Home Visitations &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
