import { getApiBaseUrl } from '../LoginPage'

export const getAuthToken = (): string => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('fcu_token') || ''
}

export const fcuFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const baseUrl = getApiBaseUrl()
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })
}
