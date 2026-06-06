'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, Phone, User } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        name,
        email,
        phone,
        password,
        role,
      });
      setMessage(response.data.message || 'Registration submitted.');
      if (response.data.token) {
        window.localStorage.setItem('bms_token', response.data.token);
        window.localStorage.setItem('bms_role', role);
        router.push(role === 'creator' ? '/creator' : '/user');
      }
    } catch (err) {
      setMessage('Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-[#f7c97b]">Create your account</p>
          <h1 className="text-5xl font-semibold text-white">Register and unlock the BookMyShot experience.</h1>
          <p className="max-w-2xl mx-auto text-base leading-7 text-white/70">
            Choose the role that fits your journey and start building premium wedding experiences with effortless booking and analytics.
          </p>
        </div>

        <div className="glass-card rounded-[2rem] border border-white/10 p-10 shadow-glow">
          <form onSubmit={handleSubmit} className="grid gap-6">
            <div className="grid gap-3">
              <label className="text-sm uppercase tracking-[0.28em] text-white/60">Full Name</label>
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0f0c09]/95 px-4 py-3">
                <User className="h-5 w-5 text-[#f7ca7b]" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
                  placeholder="Shreya Kapoor"
                  required
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 md:gap-5">
              <div className="grid gap-3">
                <label className="text-sm uppercase tracking-[0.28em] text-white/60">Email</label>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0f0c09]/95 px-4 py-3">
                  <Mail className="h-5 w-5 text-[#f7ca7b]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
                    placeholder="your@email.com"
                    type="email"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-3">
                <label className="text-sm uppercase tracking-[0.28em] text-white/60">Phone</label>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-[#0f0c09]/95 px-4 py-3">
                  <Phone className="h-5 w-5 text-[#f7ca7b]" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
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
                  placeholder="Create a strong password"
                  type="password"
                  required
                />
              </div>
            </div>
            <div className="grid gap-3">
              <label className="text-sm uppercase tracking-[0.28em] text-white/60">Role</label>
              <div className="rounded-3xl border border-white/10 bg-[#0f0c09]/95 px-4 py-3">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-transparent text-white outline-none"
                >
                  <option value="user">User</option>
                  <option value="creator">Creator</option>
                </select>
              </div>
            </div>

            {message ? <p className="text-sm text-white/70">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#f7c565] to-[#da9a3b] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#1c1203] shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Registering...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
