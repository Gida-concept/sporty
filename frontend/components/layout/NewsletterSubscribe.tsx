'use client';

import { useState, FormEvent } from 'react';

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Subscription failed');
      setStatus('success');
      setMessage('Thanks for subscribing! Check your inbox.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-xl bg-green-50 p-5">
        <p className="text-sm font-medium text-green-800">&#10003; {message}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-5">
      <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
      <p className="mt-1 text-sm text-gray-600">Get the latest articles delivered to your inbox.</p>
      <form onSubmit={handleSubmit} className="mt-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          disabled={status === 'loading'}
          required
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="mt-2 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
        {status === 'error' && (
          <p className="mt-2 text-xs text-red-500">{message}</p>
        )}
      </form>
      <p className="mt-2 text-xs text-gray-400">No spam, unsubscribe anytime.</p>
    </div>
  );
}
