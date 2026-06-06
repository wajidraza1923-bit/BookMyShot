interface StatCardProps {
  label: string;
  value: string;
  accent?: string;
}

export default function StatCard({ label, value, accent = 'from-[#f7c565] to-[#d2983d]' }: StatCardProps) {
  return (
    <div className="glass-card rounded-[2rem] border border-white/10 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">{label}</p>
          <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`rounded-3xl bg-gradient-to-br ${accent} px-4 py-3 text-sm font-semibold text-black`}>
          +18%
        </div>
      </div>
    </div>
  );
}
