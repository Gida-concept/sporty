'use client';

import { useState } from 'react';
import JsonLd from '@/components/seo/JsonLd';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
  className?: string;
}

export default function FAQSection({ faqs, className = '' }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faqs || faqs.length === 0) return null;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className={className}>
      <JsonLd schema={faqSchema} />

      <h2 className="mb-6 text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>

      <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const buttonId = `faq-button-${index}`;

          return (
            <div key={index}>
              <button
                id={buttonId}
                onClick={() => toggleFAQ(index)}
                className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-brand-600"
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="pr-4 text-base font-medium text-gray-900">{faq.question}</span>
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className={`overflow-hidden transition-all duration-200 ${
                  isOpen ? 'pb-4' : 'max-h-0'
                }`}
              >
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
