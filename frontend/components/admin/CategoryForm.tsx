'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface CategoryFormProps {
  category?: Category;
  onSave: (data: { name: string; description?: string; slug?: string }) => void;
  onCancel: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [description, setDescription] = useState(category?.description || '');
  const [nameTouched, setNameTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!category && !nameTouched) {
      setSlug(slugify(name));
    }
  }, [name, category, nameTouched]);

  function handleSlugChange(value: string) {
    setNameTouched(true);
    setSlug(slugify(value));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Category name is required';
    if (!slug.trim()) newErrors.slug = 'Slug is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      slug: slug.trim(),
    });
  }

  const isEditing = !!category;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="cat-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Category name"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="cat-slug" className="block text-sm font-medium text-gray-700">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          id="cat-slug"
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
            errors.slug ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="category-slug"
        />
        {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
        {!isEditing && !nameTouched && name.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">Auto-generated from name</p>
        )}
      </div>

      <div>
        <label htmlFor="cat-description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="cat-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Optional description"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
