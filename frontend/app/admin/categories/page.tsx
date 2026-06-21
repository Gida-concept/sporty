'use client';

import { useEffect, useState } from 'react';
import CategoryTable from '@/components/admin/CategoryTable';
import CategoryForm from '@/components/admin/CategoryForm';
import Button from '@/components/ui/Button';
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} from '@/lib/admin-api';
import type { AdminCategory } from '@/components/admin/CategoryTable';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  async function fetchCategories() {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminCategories();
      setCategories(data.data || data || []);
    } catch (err) {
      setError('Failed to load categories.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  async function handleSave(data: { name: string; description?: string; slug?: string }) {
    try {
      if (editingCategory) {
        await updateCategory(String(editingCategory.id), data);
      } else {
        await createCategory({ name: data.name, description: data.description });
      }
      setShowForm(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      setError('Failed to save category.');
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    try {
      await deleteCategory(String(deletingCategory.id), reassignTo || undefined);
      setDeletingCategory(null);
      setReassignTo('');
      fetchCategories();
    } catch (err) {
      setError('Failed to delete category.');
    }
  }

  function openEdit(cat: AdminCategory) {
    setEditingCategory(cat);
    setShowForm(true);
  }

  function openCreate() {
    setEditingCategory(null);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Button variant="primary" onClick={openCreate}>
          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : (
        <CategoryTable
          categories={categories}
          onEdit={openEdit}
          onDelete={(cat) => setDeletingCategory(cat)}
        />
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingCategory(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <CategoryForm
              category={
                editingCategory
                  ? {
                      id: editingCategory.id,
                      name: editingCategory.name,
                      slug: editingCategory.slug,
                      description: editingCategory.description,
                    }
                  : undefined
              }
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditingCategory(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Delete Category</h2>
            <p className="mb-4 text-sm text-gray-600">
              Are you sure you want to delete <strong>{deletingCategory.name}</strong>?
            </p>
            {deletingCategory.articleCount > 0 && (
              <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                This category has {deletingCategory.articleCount} articles. Select a category to
                reassign them:
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">-- Select category --</option>
                  {categories
                    .filter((c) => c.id !== deletingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setDeletingCategory(null);
                  setReassignTo('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deletingCategory.articleCount > 0 && !reassignTo}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
