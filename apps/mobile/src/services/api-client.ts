import { Platform } from 'react-native';
import { secureStorage } from './secure-storage';

const DEFAULT_DEV_URL = 'http://192.168.10.171:4000';

let customBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  if (customBaseUrl) return customBaseUrl;
  const saved = await secureStorage.getItem('api_base_url');
  if (saved) {
    customBaseUrl = saved;
    return saved;
  }
  return DEFAULT_DEV_URL;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  customBaseUrl = url;
  await secureStorage.setItem('api_base_url', url);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  try {
    const baseUrl = await getApiBaseUrl();
    const token = await secureStorage.getItem('auth_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const normalizedEndpoint = endpoint.startsWith('/api/v1')
      ? endpoint
      : endpoint.replace(/^\/api/, '/api/v1');

    const response = await fetch(`${baseUrl}${normalizedEndpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      success: true,
      data: data.data !== undefined ? data.data : data,
      status: response.status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network request failed',
    };
  }
}
