import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'GameDayWire privacy policy — how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: June 19, 2026</p>
      <div className="mt-8 space-y-6 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          <p className="mt-2">
            We collect information you provide directly, such as your email address when you
            subscribe to our newsletter. We also automatically collect certain technical information
            when you visit our site, including your IP address, browser type, device information,
            and pages visited.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To deliver our newsletter and content updates</li>
            <li>To analyze and improve our content and user experience</li>
            <li>To comply with legal obligations</li>
            <li>To serve relevant advertisements (where applicable)</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Cookies</h2>
          <p className="mt-2">
            We use cookies and similar tracking technologies to enhance your browsing experience,
            analyze site traffic, and serve targeted advertisements. You can control cookie
            preferences through your browser settings.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Third-Party Services</h2>
          <p className="mt-2">
            We may use third-party services for analytics and advertising. These services may
            collect information about your visit. We do not sell your personal information.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. Data Security</h2>
          <p className="mt-2">
            We implement reasonable security measures to protect your information. However, no
            method of transmission over the Internet is 100% secure.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Your Rights</h2>
          <p className="mt-2">
            Depending on your location, you may have the right to access, correct, delete, or port
            your personal data. Contact us at privacy@gamedaywire.com to exercise these rights.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Contact</h2>
          <p className="mt-2">
            For privacy-related inquiries, contact us at privacy@gamedaywire.com.
          </p>
        </section>
      </div>
    </div>
  );
}
