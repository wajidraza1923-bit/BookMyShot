'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/layout/DashboardShell';
import StatCard from '@/components/dashboard/StatCard';
import { apiClient } from '@/lib/api';

interface DashboardMetrics {
  totalCreators: number;
  activeCreators: number;
  featuredCreators: number;
  subscriptionRevenue: number;
  commissionRevenue: number;
  featuredRevenue: number;
  searchBoostRevenue: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingApprovals: number;
  currency: string;
}

const currencySymbols: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency + ' ';
  return `${symbol}${amount.toLocaleString()}`;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/api/admin/dashboard-overview')
      .then((response) => setMetrics(response.data.data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardShell
        role="admin"
        title="Super Admin"
        subtitle="Luxury management for creators, bookings, revenue and platform operations."
      >
        <div className="grid gap-6 xl:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[2rem] border border-white/10 bg-[#0c0907]/60 p-6 shadow-soft"
            >
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="mt-4 h-8 w-16 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </DashboardShell>
    );
  }

  const currency = metrics?.currency || 'INR';

  const statCards = [
    {
      label: 'Total Creators',
      value: `${metrics?.totalCreators ?? 0}`,
      accent: 'from-[#f7c565] to-[#d2983d]',
      href: '/admin/creators',
    },
    {
      label: 'Active Creators',
      value: `${metrics?.activeCreators ?? 0}`,
      accent: 'from-[#ecb74a] to-[#dea160]',
      href: '/admin/creators',
    },
    {
      label: 'Featured Creators',
      value: `${metrics?.featuredCreators ?? 0}`,
      accent: 'from-[#adc775] to-[#c7a15c]',
      href: '/admin/creators',
    },
    {
      label: 'Subscription Revenue',
      value: formatCurrency(metrics?.subscriptionRevenue ?? 0, currency),
      accent: 'from-[#bb9bd0] to-[#a683c5]',
      href: '/admin/revenue',
    },
    {
      label: 'Commission Revenue',
      value: formatCurrency(metrics?.commissionRevenue ?? 0, currency),
      accent: 'from-[#7bc5c7] to-[#5ca0a6]',
      href: '/admin/revenue',
    },
    {
      label: 'Featured Revenue',
      value: formatCurrency(metrics?.featuredRevenue ?? 0, currency),
      accent: 'from-[#f7a565] to-[#d27a3d]',
      href: '/admin/revenue',
    },
    {
      label: 'Search Boost Revenue',
      value: formatCurrency(metrics?.searchBoostRevenue ?? 0, currency),
      accent: 'from-[#c5a5f7] to-[#9b6dd0]',
      href: '/admin/revenue',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(metrics?.totalRevenue ?? 0, currency),
      accent: 'from-[#f7c565] to-[#d2983d]',
      href: '/admin/revenue',
    },
    {
      label: 'Pending Payments',
      value: `${metrics?.pendingPayments ?? 0}`,
      accent: 'from-[#f79565] to-[#d2603d]',
      href: '/admin/finance',
    },
    {
      label: 'Pending Approvals',
      value: `${metrics?.pendingApprovals ?? 0}`,
      accent: 'from-[#f76565] to-[#d23d3d]',
      href: '/admin/creators',
    },
  ];

  return (
    <DashboardShell
      role="admin"
      title="Super Admin"
      subtitle="Luxury management for creators, bookings, revenue and platform operations."
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="block transition hover:-translate-y-1 hover:shadow-lg"
          >
            <StatCard label={stat.label} value={stat.value} accent={stat.accent} />
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
