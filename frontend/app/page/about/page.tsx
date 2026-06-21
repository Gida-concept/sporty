import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about GameDayWire — our mission, methodology, and team behind the automated sports and entertainment news platform.',
  openGraph: {
    title: 'About GameDayWire',
    description: 'Learn about our mission, methodology, and team.',
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About GameDayWire',
  description:
    'GameDayWire is an automated programmatic SEO blog engine covering sports and entertainment.',
};

export default function AboutPage() {
  return (
    <>
      <JsonLd schema={schema} />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">About GameDayWire</h1>
        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Our Mission</h2>
            <p className="mt-2 text-gray-600 leading-relaxed">
              GameDayWire delivers timely, original sports and entertainment content to readers
              across the globe. We combine advanced AI technology with rigorous editorial standards
              to produce articles that inform, engage, and entertain — every single day.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">How We Work</h2>
            <p className="mt-2 text-gray-600 leading-relaxed">
              Our system discovers trending topics across sports and entertainment, validates them
              through real search data, and generates well-researched articles using a structured
              Content Guide Engine. Every article includes multiple data points, expert sources, and
              original analysis — never regurgitated content.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Our Standards</h2>
            <ul className="mt-2 space-y-2 text-gray-600">
              <li className="flex gap-2">
                <span className="text-brand-600 font-bold">•</span>
                <span>
                  <strong>Originality:</strong> Every article is generated from scratch using
                  structured content guides and fresh data sources.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-600 font-bold">•</span>
                <span>
                  <strong>Accuracy:</strong> We verify facts against multiple sources and update
                  articles when new information emerges.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-brand-600 font-bold">•</span>
                <span>
                  <strong>Transparency:</strong> AI-generated content is clearly labeled. Our
                  methodology is documented and open to review.
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
            <p className="mt-2 text-gray-600 leading-relaxed">
              Have questions or feedback? We&apos;d love to hear from you. Reach out at{' '}
              <a
                href="mailto:contact@gamedaywire.com"
                className="text-brand-600 hover:text-brand-700 underline"
              >
                contact@gamedaywire.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
