interface BookingRow {
  client: string;
  creator: string;
  date: string;
  status: string;
  amount: string;
}

interface RecentTableProps {
  rows: BookingRow[];
}

export default function RecentTable({ rows }: RecentTableProps) {
  return (
    <div className="glass-card rounded-[2rem] border border-white/10 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">Recent bookings</p>
          <h3 className="mt-3 text-xl font-semibold text-white">Latest booking activity</h3>
        </div>
        <span className="rounded-full bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/70">Live</span>
      </div>
      <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/10">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-white/70">
          <thead className="bg-[#0f0c09]/95 text-white/70">
            <tr>
              <th className="px-5 py-4">Client</th>
              <th className="px-5 py-4">Creator</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-white/10 bg-[#080705]/95">
                <td className="px-5 py-4 font-medium text-white">{row.client}</td>
                <td className="px-5 py-4">{row.creator}</td>
                <td className="px-5 py-4">{row.date}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs ${row.status === 'Confirmed' ? 'bg-emerald-500/15 text-emerald-200' : row.status === 'Pending' ? 'bg-amber-500/15 text-amber-200' : 'bg-white/10 text-white/80'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold text-white">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
