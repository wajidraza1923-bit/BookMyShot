'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/layout/DashboardShell';
import StatCard from '@/components/dashboard/StatCard';
import MetricGraph from '@/components/dashboard/MetricGraph';
import RecentTable from '@/components/dashboard/RecentTable';
import { apiClient } from '@/lib/api';
import { userStats, recentBookings } from '@/lib/mockData';

const featuredCreators = [
  { name: 'Arjun Kapoor', specialty: 'Cinematic ceremonies', city: 'Mumbai', rating: 4.9 },
  { name: 'Nisha Malhotra', specialty: 'Editorial pre-weddings', city: 'Jaipur', rating: 4.8 },
  { name: 'Rohan Mehta', specialty: 'Luxury receptions', city: 'Goa', rating: 4.9 },
];

export default function UserDashboardPage() {
  const [creators, setCreators] = useState(featuredCreators);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/api/creators?featured=true')
      .then((response) => {
        if (response.data.creators?.length) {
          setCreators(response.data.creators.slice(0, 3).map((creator: any) => ({
            name: creator.user?.name || 'Creator',
            specialty: creator.specialty || creator.category || 'Wedding creator',
            city: creator.city || 'Mumbai',
            rating: creator.rating?.toFixed(1) || '4.9',
          })));
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell role="user" title="User Dashboard" subtitle="Browse premium creators, manage bookings, wishlist and schedule reminders.">
      <div className="grid gap-6 xl:grid-cols-4">
        {userStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-[2rem] border border-white/10 p-6 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-white/60">Featured creators</p>
              <h3 className="mt-3 text-xl font-semibold text-white">Handpicked for your luxury wedding.</h3>
            </div>
            <Link href="/user" className="text-sm text-[#f7c97b] hover:text-white">
              Explore all
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {(loading ? featuredCreators : creators).map((creator, index) => (
              <div key={index} className="rounded-[1.75rem] border border-white/10 bg-[#080705]/95 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{creator.name}</h4>
                    <p className="text-sm text-white/60">{creator.specialty} • {creator.city}</p>
                  </div>
                  <span className="rounded-full bg-[#1c150f] px-4 py-2 text-sm text-[#f7c97b]">{creator.rating} ★</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <MetricGraph
          title="Booking health"
          description="Track your planner activity and spend confidence."
          values={[18, 26, 42, 52, 36, 58, 74]}
          highlight="Budget planning improved by 12%"
        />
      </section>

      <RecentTable rows={recentBookings} />
    </DashboardShell>
  );
}
