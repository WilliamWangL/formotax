'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel, Input } from '@/components/ui/field';
import { login, registerAccount } from '@/lib/api';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const isRegister = mode === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await registerAccount({ email: email.trim(), password, name: name.trim() || undefined });
      } else {
        await login({ email: email.trim(), password });
      }
      router.push(next && next.startsWith('/') ? next : '/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {isRegister ? (
        <div>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Morgan"
          />
        </div>
      ) : null}

      <div>
        <FieldLabel htmlFor="email" required>
          Email address
        </FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <FieldLabel htmlFor="password" required hint={isRegister ? 'At least 8 characters' : undefined}>
          Password
        </FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <FieldError message={error ?? undefined} />

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {isRegister ? 'Create account' : 'Sign in'}
      </Button>

      <p className="text-xs leading-5 text-slate-500">
        {isRegister ? (
          <>
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline">
              terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>
            . Filling a form stays free and anonymous; an account is needed to pay for a download.
          </>
        ) : (
          <>
            Forgot your password? Email support. You can still{' '}
            <Link href="/forms/w9/fill" className="underline">
              fill a form without signing in
            </Link>
            ; only downloading needs an account.
          </>
        )}
      </p>

      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Accounts store your email and download receipts. Form answers and signatures are never
          uploaded.
        </span>
      </div>
    </form>
  );
}
