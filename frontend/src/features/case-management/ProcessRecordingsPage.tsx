import { PageHeader } from '../../components/layout/PageHeader';

export function ProcessRecordingsPage() {
  return (
    <div>
      <PageHeader title="Process Recordings" subtitle="Session documentation and case notes" />
      <div className="rounded-xl border border-slate-navy/10 bg-sage-green/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Process Recordings &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
