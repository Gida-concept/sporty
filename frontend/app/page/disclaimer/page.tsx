import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description:
    'GameDayWire disclaimer — affiliate relationships, AI-generated content disclosure, and limitations of liability.',
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Disclaimer</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: June 19, 2026</p>
      <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">AI-Generated Content</h2>
          <p className="mt-2">
            Some content on GameDayWire is generated with the assistance of artificial intelligence.
            All AI-generated content is reviewed for quality and accuracy before publication.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">Affiliate Disclosure</h2>
          <p className="mt-2">
            GameDayWire may participate in affiliate marketing programs. We may earn a commission
            when you click on or make purchases through certain links on our site.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">Accuracy</h2>
          <p className="mt-2">
            Content on GameDayWire is for informational and entertainment purposes only. We make no
            representations regarding the completeness or accuracy of any information.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">Professional Advice</h2>
          <p className="mt-2">
            Content on GameDayWire should not be considered professional advice. Always consult
            qualified professionals for advice specific to your situation.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">External Links</h2>
          <p className="mt-2">
            Our site may contain links to external websites. We are not responsible for the content
            or practices of third-party sites.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
          <p className="mt-2">
            For questions about this disclaimer, contact us at legal@gamedaywire.com.
          </p>
        </section>
      </div>
    </div>
  );
}
