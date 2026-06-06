'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { ArrowRight, Lock, UserCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@bookmyshot.com');
  const [password, setPassword] = useState('Admin@123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        email,
        password,
      });
      const { token, user } = response.data;
      window.localStorage.setItem('bms_token', token);
      window.localStorage.setItem('bms_role', user.role);
      const redirect = user.role === 'admin' ? '/admin' : user.role === 'creator' ? '/creator' : '/user';
      router.push(redirect);
    } catch (err) {
      setError('Invalid credentials or server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,207,114,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),transparent_20%),linear-gradient(180deg,#050302_0%,#090604_100%)] px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f7c97b]">Welcome back</p>
          <h1 className="text-5xl font-semibold text-white">Secure login for BookMyShot dashboards.</h1>
          <p className="max-w-2xl mx-auto text-base leading-7 text-white/70">
            Use role-based authentication and jump into the premium admin, creator or user workspace.
          </p>
        </div>

        <div className="glass-card rounded-[2rem] border border-white/10 p-10 shadow-glow">
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-3">
              <label className="text-sm uppercase tracking-[0.28em] text-white/60">Email</label>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0f0c09]/95 px-4 py-3">
                <UserCircle2 className="h-5 w-5 text-[#f7ca7b]" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
                  placeholder="admin@bookmyshot.com"
                  type="email"
                />
              </div>
            </div>
            <div className="grid gap-3">
              <label className="text-sm uppercase tracking-[0.28em] text-white/60">Password</label>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0f0c09]/95 px-4 py-3">
                <Lock className="h-5 w-5 text-[#f7ca7b]" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
                  placeholder="Enter password"
                  type="password"
                />
              </div>
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#f7c565] to-[#da9a3b] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#1c1203] shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#090705]/90 p-6 text-sm text-white/70 shadow-soft">
          <p>Don’t have an account yet? Register as a user or a creator and start booking.</p>
          <a href="/register" className="text-[#f7c97b] hover:text-white">Create account</a>
        </div>
      </div>
    </main>
  );
}
