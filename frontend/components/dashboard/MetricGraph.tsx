interface MetricGraphProps {
  title: string;
  description: string;
  values: number[];
  highlight: string;
}

export default function MetricGraph({ title, description, values, highlight }: MetricGraphProps) {
  return (
    <div className="glass-card rounded-[2rem] border border-white/10 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">{title}</p>
          <p className="mt-3 text-xl font-semibold text-white">{description}</p>
        </div>
        <span className="rounded-3xl bg-[#1d160f]/90 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#f7c97b]">Trending</span>
      </div>
      <div className="mt-8 grid gap-3">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span className="h-3 w-3 rounded-full bg-[#f7c97b]" />
          <span>{highlight}</span>
        </div>
        <div className="flex h-28 items-end gap-2 rounded-3xl bg-[#080705]/95 p-4">
          {values.map((value, index) => (
            <div key={index} className="relative flex-1">
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-full bg-white/5" />
              <div style={{ height: `${Math.max(value, 12)}%` }} className="relative mx-auto w-full rounded-full bg-gradient-to-t from-[#f7c97b] to-[#f4d389] transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
