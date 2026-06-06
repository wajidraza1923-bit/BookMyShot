'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import StatCard from '@/components/dashboard/StatCard';
import MetricGraph from '@/components/dashboard/MetricGraph';
import RecentTable from '@/components/dashboard/RecentTable';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { apiClient } from '@/lib/api';
import { creatorStats, recentBookings, activityFeed } from '@/lib/mockData';

export default function CreatorDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/api/creator/analytics')
      .then((response) => setStats(response.data.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cardData = stats
    ? [
        { label: 'Active Bookings', value: `${stats.totalBookings || 0}` },
        { label: 'Pending Requests', value: `${stats.pending || 0}` },
        { label: 'Earnings', value: `₹${stats.earnings || 0}` },
        { label: 'Upcoming Events', value: `${stats.upcoming || 0}` },
      ]
    : creatorStats;

  return (
    <DashboardShell role="creator" title="Creator Panel" subtitle="Premium portfolio, booking requests, earnings analytics and client workflows.">
      <div className="grid gap-6 xl:grid-cols-4">
        {cardData.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <MetricGraph
          title="Earnings performance"
          description="Monthly revenue curve for premium creator bookings."
          values={[32, 54, 78, 95, 88, 102, 118]}
          highlight="Earnings increased 16% this month"
        />
        <ActivityFeed items={activityFeed} />
      </div>
      <RecentTable rows={recentBookings} />
    </DashboardShell>
  );
}
