import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, ShieldCheck, SlidersHorizontal } from 'lucide-react';

const features = [
  {
    title: 'Role-based dashboards',
    description: 'Separate Admin, Creator and User experiences with premium navigation.',
    icon: ShieldCheck,
  },
  {
    title: 'Live analytics',
    description: 'Animated charts, activity feed, bookings and revenue insights.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Luxury UI',
    description: 'Glassmorphism panels, gold accents and responsive motion.',
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10 lg:px-16">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.35em] text-white/70">
            Premium wedding platform
          </span>
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              BookMyShot — luxury creator booking, redesigned for modern weddings.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-white/70">
              Launch a full stack booking experience with Admin, Creator, and User panels built for premium service, analytics, notifications, and elegant workflows.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#fad88a] to-[#f9b151] px-6 py-3 text-sm font-semibold text-[#1b1203] shadow-glow transition hover:-translate-y-0.5">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#overview" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-white/80 transition hover:border-white/30 hover:text-white">
                Explore dashboard
              </a>
            </div>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="glass-card overflow-hidden border border-white/10 p-8 shadow-soft">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0f0c09]/90 p-6">
            <div className="flex items-center justify-between gap-4 text-white/75">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#ffd78e]">Platform pulse</p>
                <h2 className="mt-3 text-3xl font-semibold">Live premium insights</h2>
              </div>
              <div className="rounded-2xl bg-[#11100d] px-4 py-3 text-xs uppercase tracking-[0.3em] text-[#ffd278]">Pro</div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm uppercase text-white/50">Revenue</p>
                <p className="mt-3 text-2xl font-semibold text-white">₹12.4M</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm uppercase text-white/50">Creators</p>
                <p className="mt-3 text-2xl font-semibold text-white">382</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-5">
                <p className="text-sm uppercase text-white/50">Bookings</p>
                <p className="mt-3 text-2xl font-semibold text-white">1,120</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="overview" className="mt-16 space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <motion.article key={feature.title} whileHover={{ y: -6 }} className="glass-card rounded-[2rem] border border-white/10 p-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2c77b]/15 text-[#f6dea9]">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">{feature.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/70">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </main>
  );
}
