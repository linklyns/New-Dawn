import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';

export function ResidentDetail() {
  const { id } = useParams();

  return (
    <div>
      <PageHeader title="Resident Detail" subtitle={`Resident ID: ${id}`} />
      <div className="rounded-xl border border-slate-navy/10 bg-sky-blue/10 p-12 text-center dark:border-white/10">
        <p className="text-lg text-warm-gray">Resident Detail &mdash; Coming In Phase 5</p>
      </div>
    </div>
  );
}
