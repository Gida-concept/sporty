'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleEditor from '@/components/admin/ArticleEditor';
import LinkManager from '@/components/admin/LinkManager';
import { Button } from '@/components/ui/button';
import {
  addLink,
  getAdminCategories,
  getArticleById,
  removeLink,
  updateArticle,
} from '@/lib/admin-api';

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'links' | 'preview'>('editor');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [articleData, categoriesData] = await Promise.all([
          getArticleById(id),
          getAdminCategories(),
        ]);
        if (!articleData) {
          setNotFound(true);
          return;
        }
        setArticle(articleData.data || articleData);
        setCategories(categoriesData.data?.categories || categoriesData?.categories || []);
      } catch (err) {
        setError('Failed to load article.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(data: Record<string, unknown>) {
    setIsSaving(true);
    setSaveSuccess('');
    try {
      await updateArticle(id, data);
      setSaveSuccess('Article updated successfully.');
      // Refresh article data
      const refreshed = await getArticleById(id);
      setArticle(refreshed.data || refreshed);
    } catch (err) {
      setError('Failed to save article.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddLink(linkData: { url: string; anchorText: string; linkType: string }) {
    try {
      await addLink(id, linkData);
      const refreshed = await getArticleById(id);
      setArticle(refreshed.data || refreshed);
    } catch (err) {
      setError('Failed to add link.');
    }
  }

  async function handleRemoveLink(linkId: number) {
    try {
      await removeLink(id, String(linkId));
      const refreshed = await getArticleById(id);
      setArticle(refreshed.data || refreshed);
    } catch (err) {
      setError('Failed to remove link.');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Article Not Found</h2>
        <p className="mb-4 text-sm text-gray-500">
          The article you are looking for does not exist.
        </p>
        <Button onClick={() => router.push('/admin/articles')}>
          Back to Articles
        </Button>
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-12">
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <Button onClick={() => router.push('/admin/articles')}>
          Back to Articles
        </Button>
      </div>
    );
  }

  const tabs = [
    { key: 'editor' as const, label: 'Metadata' },
    { key: 'links' as const, label: 'Links' },
    { key: 'preview' as const, label: 'Preview' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/articles')}
            className="mb-1 text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to Articles
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{article?.title || 'Edit Article'}</h1>
        </div>
      </div>

      {saveSuccess && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveSuccess}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {activeTab === 'editor' && (
          <ArticleEditor
            article={article}
            categories={categories}
            onSave={handleSave}
            onCancel={() => router.push('/admin/articles')}
          />
        )}

        {activeTab === 'links' && (
          <LinkManager
            articleId={Number(id)}
            internalLinks={article.internalLinks || article.internal_links || []}
            externalLinks={article.externalLinks || article.external_links || []}
            onAdd={handleAddLink}
            onRemove={handleRemoveLink}
          />
        )}

        {activeTab === 'preview' && (
          <div className="prose prose-gray max-w-none">
            {article.contentHtml ? (
              <div dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
            ) : (
              <p className="text-sm text-gray-400">No content available for preview.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
