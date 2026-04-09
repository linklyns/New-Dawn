import { X, Printer } from 'lucide-react';
import { useRef } from 'react';

interface DonorListItem {
  supporterId: string;
  displayName: string;
  likelihoodScore: string;
  topReason: string;
}

interface ResidentListItem {
  residentId: number;
  internalCode: string;
  riskLevel: string;
  riskSource: string;
  topFactor: string;
}

interface NotificationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'LowLikelihoodDonors' | 'HighRiskResidents';
  listData: string;
}

export function NotificationListModal({ isOpen, onClose, title, type, listData }: NotificationListModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  let parsed: DonorListItem[] | ResidentListItem[] = [];
  try {
    parsed = JSON.parse(listData);
  } catch {
    parsed = [];
  }

  function handlePrint() {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 24px; color: #2D3A4A; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .date { font-size: 12px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #2D3A4A; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f9fafb; }
      </style>
    `;

    printWindow.document.write(`
      <html><head><title>${title}</title>${styles}</head><body>
        <h1>${title}</h1>
        <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
        ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-navy/10 bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-navy/10 px-5 py-4 dark:border-white/10">
          <h3 className="text-lg font-semibold text-slate-navy dark:text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-slate-navy/5 px-3 py-1.5 text-xs font-medium text-slate-navy transition-colors hover:bg-slate-navy/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-navy/40 transition-colors hover:bg-slate-navy/10 hover:text-slate-navy dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4" ref={printRef}>
          {type === 'LowLikelihoodDonors' ? (
            <DonorTable items={parsed as DonorListItem[]} />
          ) : (
            <ResidentTable items={parsed as ResidentListItem[]} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-navy/10 px-5 py-3 dark:border-white/10">
          <p className="text-xs text-slate-navy/40 dark:text-white/40">
            {(parsed as unknown[]).length} item(s) • Generated {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function DonorTable({ items }: { items: DonorListItem[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b-2 border-slate-navy/20 dark:border-white/20">
          <th className="pb-2 pr-4 text-left font-semibold text-slate-navy dark:text-white">Name</th>
          <th className="pb-2 pr-4 text-left font-semibold text-slate-navy dark:text-white">Likelihood</th>
          <th className="pb-2 text-left font-semibold text-slate-navy dark:text-white">Top Reason</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.supporterId || i} className="border-b border-slate-navy/5 dark:border-white/5">
            <td className="py-2.5 pr-4 text-slate-navy dark:text-white">{item.displayName}</td>
            <td className="py-2.5 pr-4">
              <span className="rounded-full bg-coral-pink/10 px-2 py-0.5 text-xs font-medium text-coral-pink">
                {Number(item.likelihoodScore).toFixed(2)}
              </span>
            </td>
            <td className="py-2.5 text-slate-navy/60 dark:text-white/60">{item.topReason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResidentTable({ items }: { items: ResidentListItem[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b-2 border-slate-navy/20 dark:border-white/20">
          <th className="pb-2 pr-4 text-left font-semibold text-slate-navy dark:text-white">Code</th>
          <th className="pb-2 pr-4 text-left font-semibold text-slate-navy dark:text-white">Risk Level</th>
          <th className="pb-2 pr-4 text-left font-semibold text-slate-navy dark:text-white">Source</th>
          <th className="pb-2 text-left font-semibold text-slate-navy dark:text-white">Top Factor</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={item.residentId || i} className="border-b border-slate-navy/5 dark:border-white/5">
            <td className="py-2.5 pr-4 font-medium text-slate-navy dark:text-white">{item.internalCode}</td>
            <td className="py-2.5 pr-4">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.riskLevel === 'Critical'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              }`}>
                {item.riskLevel}
              </span>
            </td>
            <td className="py-2.5 pr-4">
              <span className="rounded bg-slate-navy/5 px-1.5 py-0.5 text-xs text-slate-navy/60 dark:bg-white/5 dark:text-white/60">
                {item.riskSource}
              </span>
            </td>
            <td className="py-2.5 text-slate-navy/60 dark:text-white/60">{item.topFactor}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
