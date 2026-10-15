'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Repository } from '@/lib/repository';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { refreshData, showToast, isSupabaseMode } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { user, error: authError } = await Repository.signIn(email, password);
      if (authError) {
        setError(authError);
        return;
      }
      await refreshData();
      showToast(`Welcome back, ${user?.display_name || user?.email}!`);
      router.push('/');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to sign in.');
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign In to Echelon</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSupabaseMode
              ? 'Enter your credentials to access your cloud productivity workspace'
              : 'Local demo account active. You can sign in with any email.'}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs">
          {error && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-500">
              {error}
            </div>
          )}

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
              Password
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
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-foreground underline hover:text-muted-foreground">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
