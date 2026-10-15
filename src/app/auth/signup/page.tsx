'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Repository } from '@/lib/repository';
import { useApp } from '@/context/AppContext';

export default function SignupPage() {
  const router = useRouter();
  const { refreshData, showToast, isSupabaseMode } = useApp();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !displayName) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { user, error: authError } = await Repository.signUp(email, password, displayName);
      if (authError) {
        setError(authError);
        return;
      }
      await refreshData();
      showToast(`Account created for ${user?.display_name || user?.email}!`);
      router.push('/');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold mb-3 shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSupabaseMode
              ? 'Start tracking productivity with custom XP rules on Supabase'
              : 'Create a personal workspace profile'}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs">
          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-500">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Password (min. 6 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-foreground underline hover:text-muted-foreground">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
