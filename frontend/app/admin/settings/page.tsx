'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSettings, updateSettings } from '@/lib/admin-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'textarea' | 'text' | 'number' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
  rows?: number;
  placeholder?: string;
}

interface SettingGroup {
  title: string;
  description: string;
  fields: SettingField[];
}

// ---------------------------------------------------------------------------
// Field definitions
// ---------------------------------------------------------------------------

const fieldGroups: SettingGroup[] = [
  {
    title: 'Header & Body Scripts',
    description: 'Custom HTML/JavaScript injected into every page.',
    fields: [
      { key: 'head_html', label: 'Head HTML', description: 'Injected before </head> (analytics, tracking, meta tags)', type: 'textarea', rows: 6, placeholder: 'Paste head HTML code...' },
      { key: 'body_html', label: 'Body HTML', description: 'Injected after <body> (pop-ups, notification bars)', type: 'textarea', rows: 4, placeholder: 'Paste body HTML code...' },
    ],
  },
  {
    title: 'Ad Codes',
    description: 'Custom ad HTML codes for each ad slot on the site. Leave blank for placeholder.',
    fields: [
      { key: 'ad_header_banner', label: 'Header Banner', description: '728x90 - Leaderboard banner above the header on all pages', type: 'textarea', rows: 4, placeholder: 'Paste header ad code...' },
      { key: 'ad_sidebar_1', label: 'Sidebar Ad 1', description: '300x250 - Right sidebar (middle)', type: 'textarea', rows: 4, placeholder: 'Paste sidebar ad code...' },
      { key: 'ad_sidebar_2', label: 'Sidebar Ad 2', description: '300x250 - Right sidebar (bottom)', type: 'textarea', rows: 4, placeholder: 'Paste sidebar ad code...' },
      { key: 'ad_article_sidebar', label: 'Article Sidebar Ad', description: '300x250 - Article page right sidebar', type: 'textarea', rows: 4, placeholder: 'Paste article sidebar ad code...' },
      { key: 'ad_in_article_1', label: 'In-Article Ad 1', description: '300x250 - After ~3rd content block in article body', type: 'textarea', rows: 4, placeholder: 'Paste in-article ad code...' },
      { key: 'ad_in_article_2', label: 'In-Article Ad 2', description: '300x250 - After ~7th content block in article body', type: 'textarea', rows: 4, placeholder: 'Paste in-article ad code...' },
    ],
  },
  {
    title: 'SEO Settings',
    description: 'Default SEO metadata and schema configuration.',
    fields: [
      { key: 'og_image_default', label: 'Default OG Image URL', description: 'Fallback Open Graph image when article has no featured image', type: 'text', placeholder: 'https://yoursite.com/images/og-default.jpg' },
      { key: 'enable_schema_markup', label: 'Enable Schema Markup', description: 'Toggle structured data (schema.org) generation for articles', type: 'boolean' },
    ],
  },
  {
    title: 'Social Media',
    description: 'Social media links and handles used in site metadata.',
    fields: [
      { key: 'twitter_handle', label: 'Twitter/X Handle', description: 'Twitter handle for Twitter Card metadata (without @)', type: 'text', placeholder: 'gamedaywire' },
      { key: 'facebook_page_url', label: 'Facebook Page URL', description: 'Full URL to the Facebook page', type: 'text', placeholder: 'https://facebook.com/gamedaywire' },
      { key: 'instagram_url', label: 'Instagram URL', description: 'Full URL to the Instagram profile', type: 'text', placeholder: 'https://instagram.com/gamedaywire' },
    ],
  },
  {
    title: 'Content Settings',
    description: 'Default content generation parameters.',
    fields: [
      { key: 'default_category', label: 'Default Category', description: 'Default category for article generation', type: 'text', placeholder: 'sports' },
      { key: 'max_generation_attempts', label: 'Max Generation Attempts', description: 'Number of retry attempts for failed AI content generation', type: 'number', placeholder: '3' },
      { key: 'min_word_count', label: 'Min Word Count', description: 'Minimum word count threshold for published articles', type: 'number', placeholder: '800' },
    ],
  },
  {
    title: 'Site Config',
    description: 'URL and caching settings.',
    fields: [
      { key: 'site_url', label: 'Site URL', description: 'Canonical site URL (e.g. https://gamedaywire.com)', type: 'text', placeholder: 'http://localhost:3000' },
      { key: 'cors_origin', label: 'CORS Origin', description: 'Allowed CORS origin for API requests', type: 'text', placeholder: 'http://localhost:3000' },
      { key: 'cache_ttl_seconds', label: 'Cache TTL (seconds)', description: 'Default cache duration for API responses', type: 'number', placeholder: '300' },
    ],
  },
  {
    title: 'RSS Settings',
    description: 'RSS feed configuration.',
    fields: [
      { key: 'rss_title', label: 'RSS Feed Title', description: 'Title of the RSS feed', type: 'text', placeholder: 'GameDayWire - Sports & Entertainment News' },
      { key: 'rss_description', label: 'RSS Feed Description', description: 'Description of the RSS feed', type: 'text', placeholder: 'Your daily source for original sports and entertainment analysis.' },
      { key: 'rss_max_items', label: 'Max RSS Items', description: 'Maximum number of articles in the RSS feed', type: 'number', placeholder: '50' },
    ],
  },
  {
    title: 'Operational Settings',
    description: 'System behavior flags and logging configuration.',
    fields: [
      { key: 'cron_enabled', label: 'Cron Enabled', description: 'Enable scheduled article generation jobs', type: 'boolean' },
      { key: 'log_level', label: 'Log Level', description: 'Logging verbosity', type: 'select', options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error' },
      ]},
    ],
  },
];

// ---------------------------------------------------------------------------
// Settings page component
// ---------------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderField(field: SettingField) {
    const value = settings[field.key] ?? '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.key}
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            rows={field.rows ?? 4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder={field.placeholder ?? ''}
            spellCheck={false}
          />
        );

      case 'text':
        return (
          <Input
            id={field.key}
            type="text"
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder ?? ''}
            className="w-full"
          />
        );

      case 'number':
        return (
          <Input
            id={field.key}
            type="number"
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder ?? ''}
            className="w-full max-w-xs"
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => updateField(field.key, newValue)}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => updateField(field.key, e.target.checked ? 'true' : 'false')}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-600">
              {value === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      default:
        return null;
    }
  }

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

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
                <Label htmlFor={field.key} className="mb-1 block text-sm font-medium text-gray-700">
                  {field.label}
                </Label>
                <p className="mb-2 text-xs text-gray-400">{field.description}</p>
                {renderField(field)}
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
