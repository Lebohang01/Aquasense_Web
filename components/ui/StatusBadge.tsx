import { EvalResult } from '@/lib/sans241';
export default function StatusBadge({ eval: e, size='sm' }: { eval: EvalResult; size?:'sm'|'md'|'lg' }) {
  const sz = { sm:'text-xs px-2 py-0.5', md:'text-sm px-3 py-1', lg:'text-base px-4 py-1.5' }[size];
  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-lg border ${sz} ${e.badge}`}>
      {e.emoji} {e.status}
    </span>
  );
}
