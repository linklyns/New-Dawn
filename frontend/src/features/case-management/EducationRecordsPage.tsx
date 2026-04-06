import { PageHeader } from '../../components/layout/PageHeader';

export function EducationRecordsPage() {
  return (
    <div>
      <PageHeader title="Education Records" subtitle="Track education progress and enrollment" />
      <div className="rounded-xl border border-slate-navy/10 bg-sage-green/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Education Records &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
