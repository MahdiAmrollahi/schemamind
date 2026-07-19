const TOKEN_KEY = 'schemamind_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })
  if (res.status === 204) return undefined as T

  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }

  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || res.statusText
    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new CustomEvent('schemamind:unauthorized'))
    }
    throw new ApiError(typeof detail === 'string' ? detail : 'خطای ناشناخته', res.status)
  }
  return data as T
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: any) => request<T>(p, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: <T>(p: string, body?: any) => request<T>(p, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
}
