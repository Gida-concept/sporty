'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface AdminArticleDetail {
  id: number;
  title: string;
  meta_description: string;
  h1: string;
  status: string;
  contentHtml: string;
  categories: { id: number; name: string; slug: string }[];
}

interface ArticleEditorProps {
  article: AdminArticleDetail;
  categories: Category[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function ArticleEditor({
  article,
  categories,
  onSave,
  onCancel,
}: ArticleEditorProps) {
  const [title, setTitle] = useState(article.title);
  const [metaDescription, setMetaDescription] = useState(article.meta_description || '');
  const [h1, setH1] = useState(article.h1 || '');
  const [status, setStatus] = useState(article.status);
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    article.categories?.map((c) => c.id) || [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (metaDescription.length > 160)
      newErrors.metaDescription = 'Meta description must be 160 characters or less';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      title: title.trim(),
      meta_description: metaDescription.trim(),
      h1: h1.trim(),
      status,
      categories: selectedCategories,
    });
  }

  function toggleCategory(categoryId: number) {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Article title"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="h1" className="block text-sm font-medium text-gray-700">
          H1 Heading
        </label>
        <input
          id="h1"
          type="text"
          value={h1}
          onChange={(e) => setH1(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Page H1 heading"
        />
      </div>

      <div>
        <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700">
          Meta Description
        </label>
        <textarea
          id="metaDescription"
          rows={3}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            errors.metaDescription ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Meta description for SEO (max 160 characters)"
        />
        <div className="mt-1 flex justify-between">
          {errors.metaDescription && (
            <p className="text-xs text-red-600">{errors.metaDescription}</p>
          )}
          <p
            className={`ml-auto text-xs ${metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}
          >
            {metaDescription.length}/160
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Categories</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategories.includes(cat.id)
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
