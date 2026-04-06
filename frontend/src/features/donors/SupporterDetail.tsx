import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';

export function SupporterDetail() {
  const { id } = useParams();

  return (
    <div>
      <PageHeader title="Supporter Detail" subtitle={`Supporter ID: ${id}`} />
      <div className="rounded-xl border border-slate-navy/10 bg-golden-honey/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Supporter Detail &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
