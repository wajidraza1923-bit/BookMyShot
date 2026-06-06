interface ActivityFeedItem {
  title: string;
  detail: string;
  time: string;
}

interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="glass-card rounded-[2rem] border border-white/10 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">Activity feed</p>
          <h3 className="mt-3 text-xl font-semibold text-white">Real-time platform events</h3>
        </div>
        <span className="rounded-full bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/70">Live</span>
      </div>
      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-[1.75rem] border border-white/10 bg-[#080705]/95 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-white">{item.title}</p>
              <span className="text-xs uppercase tracking-[0.25em] text-white/50">{item.time}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/70">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
