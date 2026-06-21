import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'GameDayWire terms of service — rules and guidelines for using our website and content.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: June 19, 2026</p>
      <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By accessing or using GameDayWire, you agree to be bound by these Terms of Service. If
            you do not agree, please do not use our website.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. Content Usage</h2>
          <p className="mt-2">
            All content on GameDayWire is provided for informational and entertainment purposes
            only. You may not reproduce, distribute, or create derivative works without our express
            permission.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. User Conduct</h2>
          <p className="mt-2">
            You agree not to use our site for any unlawful purpose or in violation of these terms.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Disclaimer</h2>
          <p className="mt-2">
            GameDayWire provides content &quot;as is&quot; without warranties of any kind. Some
            content may be AI-generated and is clearly labeled as such.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. Limitation of Liability</h2>
          <p className="mt-2">
            GameDayWire shall not be liable for any damages arising from your use of our website or
            reliance on our content.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Changes to Terms</h2>
          <p className="mt-2">
            We reserve the right to modify these terms at any time. Continued use of the site after
            changes constitutes acceptance of the new terms.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Contact</h2>
          <p className="mt-2">
            For questions about these terms, contact us at legal@gamedaywire.com.
          </p>
        </section>
      </div>
    </div>
  );
}
