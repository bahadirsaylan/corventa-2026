// Fetch wrapper — timeout, structured error, JSON helpers.
// Renderer doğrudan fetch yapmıyor, sadece IPC üzerinden bunu kullanıyor.

import { getConfig } from '@main/config/runtime-config'
import { childLogger } from '@main/lib/logger'

const log = childLogger('http')

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export class HttpTimeoutError extends Error {
  constructor(public readonly url: string, public readonly timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`)
    this.name = 'HttpTimeoutError'
  }
}

export interface HttpRequestOptions {
  timeoutMs?: number
  signal?: AbortSignal
  headers?: Record<string, string>
}

// DEMO MODU (CORVENTA_DEMO=1) — istekler gerçek backend yerine sahte makineye gider.
type HttpInterceptor = (method: string, url: string, body: unknown) => Promise<unknown>
let interceptor: HttpInterceptor | null = null
export function setHttpInterceptor(fn: HttpInterceptor | null): void {
  interceptor = fn
}

// Ek başlık sağlayıcı — rol sistemi (2026-11-01): oturum açıkken DataApi isteklerine
// Authorization: Bearer <token> ekler (main/services/auth/authSession.ts kaydeder). Token renderer'a hiç gitmez.
type HeaderProvider = (url: string) => Record<string, string> | undefined
let headerProvider: HeaderProvider | null = null
export function setRequestHeaderProvider(fn: HeaderProvider | null): void {
  headerProvider = fn
}

async function request<T>(
  method: string,
  url: string,
  body: unknown | undefined,
  opts: HttpRequestOptions = {},
): Promise<T> {
  if (interceptor) return (await interceptor(method, url, body)) as T
  const cfg = getConfig()
  const timeoutMs = opts.timeoutMs ?? cfg.http.defaultTimeoutMs

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)

  // Dış iptal sinyali — dinleyici istek bitince kaldırılır (uzun ömürlü sinyal tekrar kullanılırsa birikmesin)
  const onExternalAbort = () => controller.abort(opts.signal!.reason)
  opts.signal?.addEventListener('abort', onExternalAbort, { once: true })

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...headerProvider?.(url),
    ...opts.headers,
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  log.debug('http request', { method, url })

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    opts.signal?.removeEventListener('abort', onExternalAbort)
    if (controller.signal.aborted && controller.signal.reason instanceof Error
        && controller.signal.reason.message === 'timeout') {
      throw new HttpTimeoutError(url, timeoutMs)
    }
    log.warn('http request failed', { method, url, error: (err as Error).message })
    throw err
  }
  clearTimeout(timeoutId)
  opts.signal?.removeEventListener('abort', onExternalAbort)

  // 204 No Content → return undefined as T
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const responseBody = isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    log.warn('http error response', {
      method,
      url,
      status: response.status,
      body: responseBody,
    })
    const errMsg =
      isJson && responseBody && typeof responseBody === 'object' && 'error' in responseBody
        ? String((responseBody as { error: unknown }).error)
        : `HTTP ${response.status}`
    throw new HttpError(response.status, url, errMsg, responseBody)
  }

  return responseBody as T
}

export const http = {
  get: <T>(url: string, opts?: HttpRequestOptions) => request<T>('GET', url, undefined, opts),
  post: <T>(url: string, body?: unknown, opts?: HttpRequestOptions) =>
    request<T>('POST', url, body, opts),
  put: <T>(url: string, body?: unknown, opts?: HttpRequestOptions) =>
    request<T>('PUT', url, body, opts),
  delete: <T>(url: string, opts?: HttpRequestOptions) => request<T>('DELETE', url, undefined, opts),
}
