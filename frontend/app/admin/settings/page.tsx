'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSettings, updateSettings } from '@/lib/admin-api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const result = await getSettings();
        setSettings(result.data || {});
      } catch (err) {
        setError('Failed to load settings.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function updateField(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateSettings(settings);
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  }

  const fieldGroups = [
    {
      title: 'Header & Body Scripts',
      description: 'Custom HTML/JavaScript injected into every page.',
      fields: [
        { key: 'head_html', label: 'Head HTML', description: 'Injected before </head> (analytics, tracking, meta tags)', rows: 6 },
        { key: 'body_html', label: 'Body HTML', description: 'Injected after <body> (pop-ups, notification bars)', rows: 4 },
      ],
    },
    {
      title: 'Ad Codes',
      description: 'Custom ad HTML codes for each ad slot on the site. Leave blank for placeholder.',
      fields: [
        { key: 'ad_header_banner', label: 'Header Banner', description: '728x90 - Leaderboard banner above the header on all pages', rows: 4 },
        { key: 'ad_sidebar_1', label: 'Sidebar Ad 1', description: '300x250 - Right sidebar (middle)', rows: 4 },
        { key: 'ad_sidebar_2', label: 'Sidebar Ad 2', description: '300x250 - Right sidebar (bottom)', rows: 4 },
        { key: 'ad_article_sidebar', label: 'Article Sidebar Ad', description: '300x250 - Article page right sidebar', rows: 4 },
        { key: 'ad_in_article_1', label: 'In-Article Ad 1', description: '300x250 - After ~3rd content block in article body', rows: 4 },
        { key: 'ad_in_article_2', label: 'In-Article Ad 2', description: '300x250 - After ~7th content block in article body', rows: 4 },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {fieldGroups.map((group) => (
        <div key={group.title} className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{group.description}</p>
          </div>
          <div className="space-y-5 p-6">
            {group.fields.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className="mb-1 block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <p className="mb-2 text-xs text-gray-400">{field.description}</p>
                <textarea
                  id={field.key}
                  value={settings[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={field.rows}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder={`Enter ${field.label.toLowerCase()} HTML code...`}
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
