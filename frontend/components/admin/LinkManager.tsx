'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

export interface LinkItem {
  id: number;
  targetSlug: string;
  anchorText: string;
  linkType: 'internal' | 'external';
}

interface LinkManagerProps {
  articleId: number;
  internalLinks: LinkItem[];
  externalLinks: LinkItem[];
  onAdd: (data: { url: string; anchorText: string; linkType: string }) => void;
  onRemove: (linkId: number) => void;
}

export default function LinkManager({
  articleId,
  internalLinks,
  externalLinks,
  onAdd,
  onRemove,
}: LinkManagerProps) {
  const [linkType, setLinkType] = useState<'internal' | 'external'>('internal');
  const [url, setUrl] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [formError, setFormError] = useState('');

  function handleAdd() {
    setFormError('');
    if (!url.trim()) {
      setFormError('URL is required');
      return;
    }
    if (!anchorText.trim()) {
      setFormError('Anchor text is required');
      return;
    }
    onAdd({ url: url.trim(), anchorText: anchorText.trim(), linkType });
    setUrl('');
    setAnchorText('');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-3 text-sm font-medium text-gray-700">Add New Link</h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Type:</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as 'internal' | 'external')}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              linkType === 'internal'
                ? 'Target slug (e.g., /article/slug)'
                : 'Full URL (https://...)'
            }
            className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="text"
            value={anchorText}
            onChange={(e) => setAnchorText(e.target.value)}
            placeholder="Anchor text"
            className="min-w-[150px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <Button size="sm" onClick={handleAdd}>
            Add Link
          </Button>
        </div>
        {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          Internal Links ({internalLinks.length})
        </h4>
        {internalLinks.length === 0 ? (
          <p className="text-sm text-gray-400">No internal links</p>
        ) : (
          <ul className="space-y-2">
            {internalLinks.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{link.anchorText}</p>
                  <p className="truncate text-xs text-gray-500">{link.targetSlug}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-4 flex-shrink-0 text-red-600 hover:bg-red-50"
                  onClick={() => onRemove(link.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">
          External Links ({externalLinks.length})
        </h4>
        {externalLinks.length === 0 ? (
          <p className="text-sm text-gray-400">No external links</p>
        ) : (
          <ul className="space-y-2">
            {externalLinks.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{link.anchorText}</p>
                  <p className="truncate text-xs text-gray-500">{link.targetSlug}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-4 flex-shrink-0 text-red-600 hover:bg-red-50"
                  onClick={() => onRemove(link.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
