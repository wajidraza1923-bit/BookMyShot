'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, LayoutDashboard, MessageSquare, Settings, Sparkles, User, Users } from 'lucide-react';

interface DashboardShellProps {
  role: 'admin' | 'creator' | 'user';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const navItems = {
  admin: [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Creators', href: '/admin', icon: Users },
    { label: 'Bookings', href: '/admin', icon: Sparkles },
    { label: 'Messages', href: '/admin', icon: MessageSquare },
    { label: 'Settings', href: '/admin', icon: Settings },
  ],
  creator: [
    { label: 'Dashboard', href: '/creator', icon: LayoutDashboard },
    { label: 'Portfolio', href: '/creator', icon: Sparkles },
    { label: 'Calendar', href: '/creator', icon: Users },
    { label: 'Messages', href: '/creator', icon: MessageSquare },
    { label: 'Settings', href: '/creator', icon: Settings },
  ],
  user: [
    { label: 'Explore', href: '/user', icon: LayoutDashboard },
    { label: 'Bookings', href: '/user', icon: Sparkles },
    { label: 'Wishlist', href: '/user', icon: Users },
    { label: 'Messages', href: '/user', icon: MessageSquare },
    { label: 'Profile', href: '/user', icon: Settings },
  ],
};

export default function DashboardShell({ role, title, subtitle, children }: DashboardShellProps) {
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    const stored = window.localStorage.getItem('bms_notifications');
    setNotifications(stored ? Number(stored) : 3);
  }, []);

  return (
    <div className="min-h-screen bg-[#070503] text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-white/10 bg-[#090705]/95 p-6 backdrop-blur-xl lg:sticky lg:top-0 lg:min-h-screen">
          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0f0c09]/95 p-4 shadow-soft">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-[#f6d19f] to-[#b27d2f] text-black">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#f7c97b]">BookMyShot</p>
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
          </div>

          <nav className="mt-10 flex flex-col gap-2">
            {navItems[role].map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0b0907]/95 px-4 py-3 text-sm transition hover:-translate-x-1 hover:border-[#f7c97b]/40 hover:text-white"
              >
                <Icon className="h-4 w-4 text-[#f7c97b]" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 rounded-3xl border border-white/10 bg-[#0f0c09]/90 p-5 shadow-soft">
            <p className="text-xs uppercase tracking-[0.28em] text-[#f7c97b]">Premium status</p>
            <p className="mt-3 text-sm leading-6 text-white/70">Access role-aware publishing, creator approvals, booking workflows, and analytics.</p>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-3xl bg-[#12100d]/95 px-4 py-3">
              <span className="text-sm text-white/70">Notifications</span>
              <span className="rounded-full bg-[#f7c97b] px-3 py-1 text-xs font-semibold text-black">{notifications}</span>
            </div>
          </div>
        </aside>

        <main className="space-y-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-[#0c0907]/90 p-6 shadow-soft backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#f7c97b]">Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-white/70 max-w-2xl">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-full bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10">
                <Bell className="h-4 w-4 text-[#f7c97b]" />
                3 new alerts
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f7c565] to-[#d2983d] px-5 py-3 text-sm font-semibold text-[#1b1203] transition hover:-translate-y-0.5">
                View reports
              </button>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
