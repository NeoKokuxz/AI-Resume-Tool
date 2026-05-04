interface StatTileProps {
  label: string;
  value: string | number;
  /** Optional sub-text shown under the value (e.g. "vs last week") */
  hint?: string;
}

/**
 * Generic dashboard stat tile: small uppercase label + big number + optional
 * hint. Used on Interview, Dashboard, etc. for at-a-glance metrics.
 */
export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-100">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}
