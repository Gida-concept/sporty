const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

function setToken(token: string): void {
  localStorage.setItem('admin_token', token);
}
function clearToken(): void {
  localStorage.removeItem('admin_token');
}

async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    clearToken();
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalCategories: number;
  totalTrends: number;
  totalKeywords: number;
  totalPageviews: number;
  recentArticles: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    publishedAt: string;
  }>;
}

export { setToken, clearToken };

export async function login(token: string): Promise<{ sessionToken: string }> {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  // Backend returns { success: true, data: { session_token: "..." } }
  const sessionToken = data.data?.session_token || data.sessionToken || data.session_token;
  if (!sessionToken) throw new Error('Invalid response from server');
  setToken(sessionToken);
  return { sessionToken };
}

export async function isAuthenticated(): Promise<boolean> {
  return !!getToken();
}
export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return adminFetch('/admin/stats');
}
export async function getArticles(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> {
  const p = new URLSearchParams();
  if (filters?.status) p.set('status', filters.status);
  if (filters?.page) p.set('page', String(filters.page));
  if (filters?.limit) p.set('limit', String(filters.limit));
  return adminFetch(`/admin/articles?${p}`);
}
export async function getArticleById(id: string): Promise<any> {
  return adminFetch(`/admin/articles/${id}`);
}
export async function updateArticle(id: string, data: Record<string, unknown>): Promise<any> {
  return adminFetch(`/admin/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteArticle(id: string, permanent = false): Promise<any> {
  return adminFetch(`/admin/articles/${id}?permanent=${permanent}`, { method: 'DELETE' });
}
export async function getAdminCategories(): Promise<any> {
  return adminFetch('/admin/categories');
}
export async function createCategory(data: { name: string; description?: string }): Promise<any> {
  return adminFetch('/admin/categories', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCategory(id: string, data: Record<string, unknown>): Promise<any> {
  return adminFetch(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function deleteCategory(id: string, reassignTo?: string): Promise<any> {
  return adminFetch(`/admin/categories/${id}${reassignTo ? `?reassignTo=${reassignTo}` : ''}`, {
    method: 'DELETE',
  });
}
export async function getAnalytics(params?: {
  from?: string;
  to?: string;
  granularity?: string;
}): Promise<any> {
  const p = new URLSearchParams();
  if (params?.from) p.set('from', params.from);
  if (params?.to) p.set('to', params.to);
  if (params?.granularity) p.set('granularity', params.granularity);
  return adminFetch(`/admin/analytics?${p}`);
}
export async function addLink(
  articleId: string,
  data: { url: string; anchorText: string; linkType: string },
): Promise<any> {
  return adminFetch(`/admin/articles/${articleId}/links`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function removeLink(articleId: string, linkId: string): Promise<any> {
  return adminFetch(`/admin/articles/${articleId}/links/${linkId}`, { method: 'DELETE' });
}

export async function getSettings(): Promise<any> {
  return adminFetch('/admin/settings');
}

export async function updateSettings(settings: Record<string, string>): Promise<any> {
  return adminFetch('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getPublicSettings(): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/settings`, { signal: controller.signal });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data || {};
  } finally {
    clearTimeout(timeoutId);
  }
}
