import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the GameDayWire team. Send us your feedback, questions, or partnership inquiries.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Contact Us</h1>
      <p className="mt-4 text-gray-600">
        Have a question, suggestion, or partnership inquiry? We&apos;d love to hear from you.
      </p>
      <form className="mt-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <textarea
            id="message"
            rows={5}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Your message..."
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Send Message
        </button>
      </form>
    </div>
  );
}
