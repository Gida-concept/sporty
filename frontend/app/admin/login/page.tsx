'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Button from '@/components/ui/Button';

export default function AdminLoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Please enter your admin token');
      return;
    }

    setIsLoading(true);
    try {
      await login(token.trim());
      router.push('/admin');
    } catch (err) {
      setError('Login failed. Please check your token and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl font-bold text-white shadow-lg">
            G
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GameDayWire</h1>
          <p className="mt-1 text-sm text-gray-500">Admin Panel — Sign In</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
        >
          <div className="mb-6">
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Admin Token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Enter your admin token"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            type="submit"
          >
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          GameDayWire &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
