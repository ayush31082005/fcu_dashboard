import { API_BASE_URL } from '../LoginPage'
import type { ReferenceContact } from '../types/fcu'

export const getDocIcon = (name: string): string => {
  const lower = (name || '').toLowerCase()
  if (
    lower.includes('aadhaar') ||
    lower.includes('pan') ||
    lower.includes('voter') ||
    lower.includes('passport') ||
    lower.includes('license') ||
    lower.includes('id')
  ) {
    return '🪪'
  }
  if (
    lower.includes('salary') ||
    lower.includes('income') ||
    lower.includes('form 16') ||
    lower.includes('slip') ||
    lower.includes('certificate')
  ) {
    return '💵'
  }
  if (lower.includes('bank') || lower.includes('cheque') || lower.includes('statement')) {
    return '🏦'
  }
  if (
    lower.includes('utility') ||
    lower.includes('bill') ||
    lower.includes('rent') ||
    lower.includes('agreement') ||
    lower.includes('noc')
  ) {
    return '📑'
  }
  return '📄'
}

export const ekycAssetUrl = (path?: string | null): string => {
  if (!path) return ''
  const trimmed = path.trim()
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('http')) {
    return trimmed
  }
  return `${API_BASE_URL}/${trimmed.replace(/^\/+/, '')}`
}

export const reportAssetUrl = (path?: string | null): string => {
  if (!path) return ''
  const trimmed = path.trim()
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('http')) {
    return trimmed
  }
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) {
    return `${API_BASE_URL}/api/field/auth/images/${trimmed}`
  }
  return `${API_BASE_URL}/${trimmed.replace(/^\/+/, '')}`
}

export const flattenProviderFields = (data: any, prefix = ''): Array<{ label: string; value: any }> => {
  if (!data || typeof data !== 'object') return []
  const rows: Array<{ label: string; value: any }> = []
  for (const [key, val] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      rows.push(...flattenProviderFields(val, fullKey))
    } else {
      rows.push({ label: fullKey, value: val })
    }
  }
  return rows
}

export const normalizeReferenceRows = (raw: any): ReferenceContact[] => {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return {
          srNo: idx + 1,
          name: item.name || item.reference_name || item.contact_name || `Reference ${idx + 1}`,
          relation: item.relation || item.relationship || 'Friend',
          mobile: item.mobile || item.phone || item.contact_no || 'N/A',
          loanLeadId: item.loanLeadId || item.lead_id || '',
          data: item,
        }
      }
      return {
        srNo: idx + 1,
        name: String(item),
        relation: 'Contact',
        mobile: 'N/A',
        loanLeadId: '',
        data: { value: item },
      }
    })
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([key, val]: [string, any], idx) => ({
      srNo: idx + 1,
      name: val?.name || key,
      relation: val?.relation || 'Reference',
      mobile: val?.mobile || 'N/A',
      loanLeadId: val?.loanLeadId || '',
      data: typeof val === 'object' ? val : { [key]: val },
    }))
  }
  return []
}

export const resolveReferenceColumns = (rows: ReferenceContact[]): string[] => {
  const set = new Set<string>()
  rows.forEach(r => {
    if (r.data) {
      Object.keys(r.data).forEach(k => {
        if (!['srNo', 'data'].includes(k)) set.add(k)
      })
    }
  })
  if (set.size === 0) return ['name', 'relation', 'mobile']
  return Array.from(set)
}
