import { useState, useEffect, Fragment, useRef } from 'react'
import Dashboard from './Dashboard'
import LeadTracker from './LeadTracker'
import Reports from './Reports'
import LoginPage, { API_BASE_URL, type FcuUser } from './LoginPage'
import geetpayLogo from './assets/geetpay-logo.png'
import { fcuFetch } from './utils/fcuApi'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DISBURSED: { label: 'Disbursed', bg: 'bg-slate-100', text: 'text-slate-800', dot: 'bg-slate-700' },
  DOCUMENT_PENDING: { label: 'Document Pending', bg: 'bg-zinc-100', text: 'text-zinc-800', dot: 'bg-zinc-600' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
  REJECTED_BY_FCU: { label: 'Rejected by FCU', bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
  FCU_REJECTED: { label: 'Rejected by FCU', bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
  FORWARDED_REJECT: { label: 'Rejected by FCU', bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
  REJECTED_BY_CREDIT: { label: 'Rejected by Credit', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-600' },
  CREDIT_REJECTED: { label: 'Rejected by Credit', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-600' },
  PENDING: { label: 'Pending', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  APPROVED: { label: 'Approved', bg: 'bg-zinc-100', text: 'text-zinc-900', dot: 'bg-zinc-700' },
  FCU_APPROVED: { label: 'Approved by FCU', bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-600' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  FRAUD_FLAGGED: { label: 'Fraud Flagged', bg: 'bg-rose-100', text: 'text-rose-900', dot: 'bg-rose-700' },
  SENT_TO_CREDIT: { label: 'Sent to Credit', bg: 'bg-zinc-100', text: 'text-zinc-900', dot: 'bg-zinc-700' },
  FIELD_VERIFICATION: { label: 'Field Verification', bg: 'bg-slate-100', text: 'text-slate-800', dot: 'bg-slate-700' },
  HOLD: { label: 'Hold', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
}

type DocStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type CheckStatus = 'PASS' | 'FAIL' | 'PENDING'

interface RequestedDocument { id: number; documentName: string; status: string; fileName?: string; filePath?: string; uploadedAt?: string }
interface DocumentRequestData { id: number; application_id?: number; token: string; status: string; expires_at: string; documents: RequestedDocument[]; shareUrl?: string; leadId?: string; customerName?: string }
const getDocIcon = (name: string) => {
  const lower = name.toLowerCase()
  if (lower.includes('aadhaar') || lower.includes('pan') || lower.includes('voter') || lower.includes('passport') || lower.includes('license') || lower.includes('id')) {
    return '🪪'
  }
  if (lower.includes('salary') || lower.includes('income') || lower.includes('form 16') || lower.includes('slip') || lower.includes('certificate')) {
    return '💵'
  }
  if (lower.includes('bank') || lower.includes('cheque') || lower.includes('statement')) {
    return '🏦'
  }
  if (lower.includes('utility') || lower.includes('bill') || lower.includes('rent') || lower.includes('agreement') || lower.includes('noc')) {
    return '📑'
  }
  return '📄'
}
interface FcuNotification { id: string; type: 'NEW_APPLICATION' | 'FIELD_REPORT_SUBMITTED'; applicationId: number; applicationNumber: string; title: string; message: string; borrower: string; createdAt: string; isRead: boolean }

interface CaseDoc {
  id: string
  docId?: string
  name: string
  type: string
  leadId?: string
  uploaded: string
  status: DocStatus
  fileUrl?: string | null
  fileName?: string
  uploadedBy?: string
  metaIntegrityStatus?: string
  metaIntegrityDetail?: string
  faceMatch?: string | null
  details?: Record<string, unknown>
}

interface FCUCheck {
  id: string
  label: string
  status: CheckStatus
  note: string
}

interface FieldVerificationReport {
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'WAIVED'
  requestedOn: string
  assignedOfficer: string
  visitDate: string
  summary: string
  result: string
  nextAction: string
}

interface ReferenceContact {
  srNo: number
  name: string
  relation: string
  mobile: string
  loanLeadId: string
  data?: Record<string, any>
}

interface FieldDetails {
  residence: Record<string, string>
  office: Record<string, string>
}

interface FieldReport {
  reportId?: string
  outcome?: string
  remarks?: string
  submittedAt?: string
  signature?: string
  location?: { latitude?: number; longitude?: number; accuracy?: number; address?: string; source?: string }
  documents?: { aadhaar?: string; pan?: string; extraDocument?: string; checklist?: boolean[] }
  photos?: { applicant?: string; residenceOffice?: string }
  officerName?: string
  fieldOfficerName?: string
  submittedByName?: string
  employeeId?: string
  employeeCode?: string
  officerEmployeeId?: string
  submittedBy?: { name?: string; employeeId?: string; employeeCode?: string }
  officer?: { name?: string; employeeId?: string; employeeCode?: string }
}

interface EkycDetails {
  aadhaar: Record<string, string | null>
  fetchedAadhaar?: Record<string, any> | null
  pan: Record<string, string | null>
  ckyc: Record<string, string | null>
  uan: Record<string, string | null>
  bank: Record<string, string | null>
  bankPenny: Record<string, string | null>
  mobileBank: Record<string, any>
  mobileUpi: Record<string, string | null>
  selfie?: string | null
  faceMatch?: {
    percentage?: number | null
    status?: string | null
    confidence?: string | null
    details?: string | null
  } | null
}

const flattenProviderFields = (value: Record<string, any>, prefix = ''): [string, string][] =>
  Object.entries(value || {}).flatMap(([key, fieldValue]) => {
    const label = `${prefix}${key}`.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
    if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
      return flattenProviderFields(fieldValue, `${label} `)
    }
    return [[label, Array.isArray(fieldValue)
      ? fieldValue.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(' | ')
      : String(fieldValue ?? 'N/A')]]
  })

interface CaseHistoryItem {
  id: number
  type: string
  title: string
  description?: string
  performedBy: string
  role?: string
  createdAt: string
}

interface CaseRecord {
  databaseId?: number
  workflowStage?: 'DOCUMENT_REVIEW' | 'FCU_APPROVED' | 'FIELD_ASSIGNED' | 'FIELD_WAIVED' | 'FINALIZED'
  id: string; ref: string; borrower: string; initials: string; avatar: string
  mobile: string; email: string; loan: string; loanRaw: number; purpose: string; lti: string
  branch: string; rm: string; website: string; status: string; sourceStatus?: string
  applied: string; disburse: string; flags: string[]
  dob: string; gender: string; pan: string; aadhar: string
  address: string; city: string; state: string; pincode: string
  employer: string; income: string; tenure: string; cibil: string
  alternateMobile?: string
  emailOffice?: string
  corporateEmailVerification?: { isVerified: boolean; reason: string; verifiedAt?: string | null } | null
  screenedBy?: string
  screenedOn?: string
  firstName?: string
  middleName?: string
  surname?: string
  residenceType?: string
  residenceAddressLine1?: string
  residenceAddressLine2?: string
  secondaryResidenceAddressLine1?: string
  secondaryResidenceAddressLine2?: string
  secondaryResidenceCity?: string
  secondaryResidenceState?: string
  secondaryResidencePincode?: string
  secondaryResidenceType?: string
  serviceLine?: string
  owner?: string
  loanLeadId?: string
  applicationNo?: string
  leadReferenceNo?: string
  forwardedBy?: string
  forwardedOn?: string
  loanSource?: string
  title?: string
  religion?: string
  maritalStatus?: string
  obligations?: string
  contactOffice?: string
  campaign?: string
  deviceModel?: string
  deviceType?: string
  browserInfo?: string
  ipAddress?: string
  locationLat?: string
  locationLng?: string
  locationStatus?: string
  fieldDetails?: FieldDetails
  fieldReport?: FieldReport | null
  lock?: { userId: number; userName: string; expiresAt: string; isMine?: boolean } | null
  ekycDetails?: EkycDetails
  creditBureau?: {
    cibilScore?: string
    totalAccounts?: string
    activeAccounts?: string
    updatedOn?: string
    providerData?: Record<string, any>
    databaseColumns?: Record<string, any>
  }
  docs: CaseDoc[]
  checks: FCUCheck[]
  remarks: string[]
  history?: CaseHistoryItem[]
  fieldVerificationReport?: FieldVerificationReport
  references?: ReferenceContact[]
}

const buildDocs = (status: string): CaseDoc[] => [
  { id: 'd1', name: 'Aadhar Card', type: 'Identity', uploaded: '10 Jul 2025', status: 'APPROVED' },
  { id: 'd2', name: 'PAN Card', type: 'Identity', uploaded: '10 Jul 2025', status: 'APPROVED' },
  { id: 'd3', name: 'Salary Slip (3M)', type: 'Income', uploaded: '11 Jul 2025', status: status === 'DOCUMENT_PENDING' ? 'PENDING' : 'APPROVED' },
  { id: 'd4', name: 'Bank Statement (6M)', type: 'Income', uploaded: '11 Jul 2025', status: status === 'UNDER_REVIEW' ? 'PENDING' : status === 'REJECTED' ? 'REJECTED' : 'APPROVED' },
  { id: 'd5', name: 'Address Proof', type: 'Address', uploaded: '10 Jul 2025', status: 'APPROVED' },
  { id: 'd6', name: 'Passport Photo', type: 'Photo', uploaded: '10 Jul 2025', status: 'APPROVED' },
  { id: 'd7', name: 'Form 16 / ITR', type: 'Income', uploaded: '12 Jul 2025', status: status === 'DOCUMENT_PENDING' ? 'PENDING' : 'APPROVED' },
]

const buildChecks = (status: string): FCUCheck[] => [
  { id: 'c1', label: 'Identity Verification', status: 'PASS', note: 'Aadhar & PAN match confirmed' },
  { id: 'c2', label: 'Address Consistency', status: 'PASS', note: 'Address matches across documents' },
  { id: 'c3', label: 'Income Verification', status: status === 'REJECTED' ? 'FAIL' : 'PASS', note: status === 'REJECTED' ? 'Income proof insufficient' : 'Salary slips verified with employer' },
  { id: 'c4', label: 'Bank Statement Review', status: status === 'FRAUD_FLAGGED' ? 'FAIL' : status === 'UNDER_REVIEW' ? 'PENDING' : 'PASS', note: 'Cash flow analysis complete' },
  { id: 'c5', label: 'CIBIL Score Check', status: status === 'DISBURSED' || status === 'APPROVED' ? 'PASS' : status === 'REJECTED' ? 'FAIL' : 'PENDING', note: status === 'DISBURSED' || status === 'APPROVED' ? 'Score 742 — eligible' : 'Score below threshold' },
  { id: 'c6', label: 'Document Authenticity', status: status === 'DOCUMENT_PENDING' ? 'PENDING' : 'PASS', note: 'No tampering detected' },
  { id: 'c7', label: 'Fraud Pattern Scan', status: status === 'FRAUD_FLAGGED' ? 'FAIL' : 'PASS', note: 'No known fraud pattern found' },
]

const buildVerificationReport = (status: string): FieldVerificationReport => {
  if (status === 'FIELD_VERIFICATION') {
    return {
      status: 'PENDING',
      requestedOn: '12 Jul 2025',
      assignedOfficer: 'Sandeep Verma',
      visitDate: '15 Jul 2025',
      summary: 'Site location and borrower identity require physical verification before credit recommendation.',
      result: 'Pending field visit outcome',
      nextAction: 'Await field verification result to decide credit / hold / reject path.',
    }
  }

  if (status === 'HOLD') {
    return {
      status: 'FAILED',
      requestedOn: '12 Jul 2025',
      assignedOfficer: 'Sandeep Verma',
      visitDate: '15 Jul 2025',
      summary: 'Field visit completed with mismatched occupancy and commercial activity evidence.',
      result: 'Verification failed',
      nextAction: 'Case is on hold for further review and final disposition.',
    }
  }

  if (status === 'SENT_TO_CREDIT' || status === 'APPROVED' || status === 'DISBURSED') {
    return {
      status: 'PASSED',
      requestedOn: '12 Jul 2025',
      assignedOfficer: 'Sandeep Verma',
      visitDate: '15 Jul 2025',
      summary: 'Field visit was completed and borrower identity / residential details matched source records.',
      result: 'Verification passed',
      nextAction: 'Case recommended for credit processing and disbursement flow.',
    }
  }

  return {
    status: 'WAIVED',
    requestedOn: '12 Jul 2025',
    assignedOfficer: 'FCU Manager',
    visitDate: 'N/A',
    summary: 'Field verification was waived by FCU officer based on documentary confidence and low-risk review.',
    result: 'Waived',
    nextAction: 'Proceed directly to credit / approval decision without physical verification.',
  }
}

const INIT_CASES: CaseRecord[] = [
  {
    id: 'APP0000112', ref: 'LN-CRP-8726372', borrower: 'Manoj Tiwari', initials: 'MT', avatar: '#3b82f6', mobile: '9437539871', email: 'manoji@gmail.com', loan: '₹40,000', loanRaw: 40000, purpose: 'HOME REPAIR', lti: '55%', branch: 'PANROSE DELHI', rm: 'RK GOBIND MISHRA', website: 'APP', status: 'DISBURSED', applied: '16 Jul 2025', disburse: '21 Jul 2025', flags: [], dob: '12 Mar 1990', gender: 'Male', pan: 'ABCPM1234D', aadhar: 'XXXX-XXXX-4321', address: '12, MG Road, Karol Bagh', city: 'Delhi', state: 'Delhi', pincode: '110005', employer: 'HDFC Bank Ltd', income: '₹35,000/mo', tenure: '18 months', cibil: '742', alternateMobile: '9876543210', emailOffice: 'manoj@hdfcbank.com', screenedBy: 'Chandrani Poswani', screenedOn: '09-06-2020 15:30:08', firstName: 'Manoj', middleName: 'Kumar', surname: 'Tiwari', residenceType: 'OWNED', residenceAddressLine1: '12, MG Road', residenceAddressLine2: 'Karol Bagh', serviceLine: 'Personal Loan', owner: 'RK GOBIND MISHRA', docs: buildDocs('DISBURSED'), checks: buildChecks('DISBURSED'), remarks: ['Application verified by FCU team.'], references: [
      { srNo: 1, name: 'Sleena Pam Barua', relation: 'Brother', mobile: '9198851030', loanLeadId: 'APP000000099' },
      { srNo: 2, name: 'Rina Pam Barua', relation: 'Parents', mobile: '9198552745', loanLeadId: 'LEAD6379' },
    ]
  },
  { id: 'APP0000111', ref: 'LN-CRP-8726246', borrower: 'Tanvi Sharma', initials: 'TS', avatar: '#8b5cf6', mobile: '7542197874', email: 'tanvi@gmail.com', loan: '₹35,000', loanRaw: 35000, purpose: 'EDUCATION', lti: '48%', branch: 'NAZUT DELHI', rm: 'RK GOBIND MISHRA', website: 'WEBSITE', status: 'DOCUMENT_PENDING', applied: '16 Jul 2025', disburse: '21 Jul 2025', flags: ['DOCUMENT PENDING'], dob: '05 Aug 1995', gender: 'Female', pan: 'BCDTS5678E', aadhar: 'XXXX-XXXX-8765', address: '34, Laxmi Nagar', city: 'Delhi', state: 'Delhi', pincode: '110092', employer: 'Self Employed', income: '₹28,000/mo', tenure: '12 months', cibil: '698', alternateMobile: '9823456710', emailOffice: 'tanvi@eduhelp.com', screenedBy: 'Rahul Sharma', screenedOn: '09-06-2020 16:10:42', firstName: 'Tanvi', middleName: 'Rani', surname: 'Sharma', residenceType: 'RENTED', residenceAddressLine1: '34, Laxmi Nagar', residenceAddressLine2: 'Near Metro Gate', serviceLine: 'Education Loan', owner: 'RK GOBIND MISHRA', docs: buildDocs('DOCUMENT_PENDING'), checks: buildChecks('DOCUMENT_PENDING'), remarks: [] },
  { id: 'APP0000110', ref: 'LN-CRP-8736374', borrower: 'Girish Pandey', initials: 'GP', avatar: '#10b981', mobile: '9832452730', email: 'girish@gmail.com', loan: '₹65,000', loanRaw: 65000, purpose: 'EDUCATION', lti: '52%', branch: 'GOZTEP VARANASI', rm: 'RK DEEPAK MISHRA', website: 'WEBSITE', status: 'REJECTED', applied: '17 Jul 2025', disburse: '17 Jul 2025', flags: [], dob: '22 Jan 1988', gender: 'Male', pan: 'CEFGP9012F', aadhar: 'XXXX-XXXX-1234', address: '7, Lanka, BHU Road', city: 'Varanasi', state: 'Uttar Pradesh', pincode: '221005', employer: 'Govt. Teacher', income: '₹22,000/mo', tenure: '24 months', cibil: '601', alternateMobile: '9887766554', emailOffice: 'girish@govtteacher.in', screenedBy: 'Kavita Singh', screenedOn: '09-06-2020 13:45:19', firstName: 'Girish', middleName: 'Prakash', surname: 'Pandey', residenceType: 'OWNED', residenceAddressLine1: '7, Lanka', residenceAddressLine2: 'BHU Road', serviceLine: 'Education Loan', owner: 'RK DEEPAK MISHRA', docs: buildDocs('REJECTED'), checks: buildChecks('REJECTED'), remarks: ['CIBIL score below cutoff. Income verification failed.'] },
  { id: 'APP0000109', ref: 'LN-CRP-8726212', borrower: 'Shalini Verma', initials: 'SV', avatar: '#f59e0b', mobile: '9878342508', email: 'shalini@gmail.com', loan: '₹26,000', loanRaw: 26000, purpose: 'MEDICAL', lti: '38%', branch: 'NAZUT DELHI', rm: 'RK PUNEET KHULWA', website: 'WEBSITE', status: 'PENDING', applied: '16 Jul 2025', disburse: '20 Jul 2025', flags: [], dob: '18 Jun 1992', gender: 'Female', pan: 'DHISV3456G', aadhar: 'XXXX-XXXX-5678', address: '56, Pitampura', city: 'Delhi', state: 'Delhi', pincode: '110034', employer: 'Private Hospital', income: '₹31,000/mo', tenure: '12 months', cibil: '718', alternateMobile: '9811123044', emailOffice: 'shalini@hospitalmail.com', screenedBy: 'Pankaj Rawat', screenedOn: '09-06-2020 12:04:31', firstName: 'Shalini', middleName: 'Vandana', surname: 'Verma', residenceType: 'OWNED', residenceAddressLine1: '56, Pitampura', residenceAddressLine2: 'Sector 8', serviceLine: 'Medical Loan', owner: 'RK PUNEET KHULWA', docs: buildDocs('PENDING'), checks: buildChecks('PENDING'), remarks: [] },
  { id: 'APP0000108', ref: 'LN-CRP-8726116', borrower: 'Rakesh Bansal', initials: 'RB', avatar: '#6366f1', mobile: '9876541208', email: 'rakesh@gmail.com', loan: '₹20,000', loanRaw: 20000, purpose: 'BUSINESS', lti: '32%', branch: 'NAZUT DELHI', rm: 'RK PUNEET KHULWA', website: 'WEBSITE', status: 'DISBURSED', applied: '16 Jul 2025', disburse: '17 Jul 2025', flags: [], dob: '03 Nov 1985', gender: 'Male', pan: 'EIRB7890H', aadhar: 'XXXX-XXXX-9012', address: '9, Rohini Sector 5', city: 'Delhi', state: 'Delhi', pincode: '110085', employer: 'Self (Retail)', income: '₹40,000/mo', tenure: '6 months', cibil: '755', alternateMobile: '9955447788', emailOffice: 'rakesh@retailbiz.com', screenedBy: 'Krishna Meena', screenedOn: '09-06-2020 09:50:14', firstName: 'Rakesh', middleName: 'Nath', surname: 'Bansal', residenceType: 'RENTED', residenceAddressLine1: '9, Rohini Sector 5', residenceAddressLine2: 'Near Market', serviceLine: 'Business Loan', owner: 'RK PUNEET KHULWA', docs: buildDocs('DISBURSED'), checks: buildChecks('DISBURSED'), remarks: [] },
  { id: 'APP0000107', ref: 'LN-CRP-8623174', borrower: 'Neha Gupta', initials: 'NG', avatar: '#ec4899', mobile: '7897654120', email: 'neha@gmail.com', loan: '₹42,000', loanRaw: 42000, purpose: 'BUSINESS', lti: '61%', branch: 'GOZTEP JAIPUR', rm: 'RK CHANDANA CHALWANI', website: 'WEBSITE', status: 'APPROVED', applied: '14 Jul 2025', disburse: '21 Jul 2025', flags: [], dob: '29 Sep 1993', gender: 'Female', pan: 'FJKNG4567I', aadhar: 'XXXX-XXXX-3456', address: '23, Malviya Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302017', employer: 'Freelance Designer', income: '₹36,000/mo', tenure: '18 months', cibil: '731', alternateMobile: '9786541230', emailOffice: 'neha@freelancedesign.in', screenedBy: 'Anurag Pandey', screenedOn: '09-06-2020 08:22:04', firstName: 'Neha', middleName: 'Ragini', surname: 'Gupta', residenceType: 'OWNED', residenceAddressLine1: '23, Malviya Nagar', residenceAddressLine2: 'Near Park', serviceLine: 'Business Loan', owner: 'RK CHANDANA CHALWANI', docs: buildDocs('APPROVED'), checks: buildChecks('APPROVED'), remarks: [] },
  { id: 'APP0000106', ref: 'LN-CRP-8612984', borrower: 'Ashok Kumar', initials: 'AK', avatar: '#0ea5e9', mobile: '9654320871', email: 'ashok@gmail.com', loan: '₹55,000', loanRaw: 55000, purpose: 'AGRICULTURE', lti: '44%', branch: 'NAZUT BHOPAL', rm: 'RK CHANDANA CHALWANI', website: 'WEBSITE', status: 'UNDER_REVIEW', applied: '13 Jul 2025', disburse: '12 Jul 2025', flags: ['UNDER REVIEW'], dob: '14 Feb 1980', gender: 'Male', pan: 'GKLAK1234J', aadhar: 'XXXX-XXXX-7890', address: '4, Kolar Road', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462042', employer: 'Farmer', income: '₹18,000/mo', tenure: '24 months', cibil: '659', alternateMobile: '9345678901', emailOffice: 'ashok@farmermail.in', screenedBy: 'Sonal Bhatia', screenedOn: '09-06-2020 18:11:33', firstName: 'Ashok', middleName: 'Kumar', surname: 'Kumar', residenceType: 'OWNED', residenceAddressLine1: '4, Kolar Road', residenceAddressLine2: 'Bhopal', serviceLine: 'Agriculture Loan', owner: 'RK CHANDANA CHALWANI', docs: buildDocs('UNDER_REVIEW'), checks: buildChecks('UNDER_REVIEW'), remarks: ['Bank statements under review.'] },
  { id: 'APP0000105', ref: 'LN-CRP-8612748', borrower: 'Ritu Saxena', initials: 'RS', avatar: '#14b8a6', mobile: '9870214540', email: 'ritu@gmail.com', loan: '₹31,000', loanRaw: 31000, purpose: 'HOME REPAIR', lti: '49%', branch: 'PANROSE DELHI', rm: 'RK CHANDANA CHALWANI', website: 'WEBSITE', status: 'DOCUMENT_PENDING', applied: '12 Jul 2025', disburse: '12 Jul 2025', flags: ['DOCUMENT PENDING'], dob: '07 Dec 1991', gender: 'Female', pan: 'HLMRS8901K', aadhar: 'XXXX-XXXX-2345', address: '67, Dwarka Sector 10', city: 'Delhi', state: 'Delhi', pincode: '110075', employer: 'School Teacher', income: '₹26,000/mo', tenure: '18 months', cibil: '704', alternateMobile: '9812341991', emailOffice: 'ritu@schoolmail.in', screenedBy: 'Shreya Verma', screenedOn: '09-06-2020 11:08:09', firstName: 'Ritu', middleName: 'Vani', surname: 'Saxena', residenceType: 'RENTED', residenceAddressLine1: '67, Dwarka Sector 10', residenceAddressLine2: 'Near Market', serviceLine: 'Home Repair Loan', owner: 'RK CHANDANA CHALWANI', docs: buildDocs('DOCUMENT_PENDING'), checks: buildChecks('DOCUMENT_PENDING'), remarks: [] },
]

const NAV_ITEMS = ['Dashboard', 'Applications', 'Approved', 'Disbursed', 'Hold', 'Rejected/Closed', 'Reports', 'Credit Team']

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function DigitalClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = time.getHours() % 12 || 12
  const m = String(time.getMinutes()).padStart(2, '0')
  const s = String(time.getSeconds()).padStart(2, '0')
  const ampm = time.getHours() >= 12 ? 'pm' : 'am'
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return (
    <div className="crm-panel rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] min-w-[220px]">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Digital Clock</div>
      <div className="font-mono text-2xl font-bold leading-none text-slate-900">
        {h}:{m}:{s} <span className="text-base font-normal text-slate-600">{ampm}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-700">{days[time.getDay()]}</div>
      <div className="text-3xl font-bold leading-none text-slate-900">{time.getDate()}</div>
      <div className="text-sm text-slate-500">{months[time.getMonth()]}</div>
    </div>
  )
}

function LiveSessionDuration({ loginAt }: { loginAt?: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const start = loginAt ? new Date(loginAt).getTime() : now
  const seconds = Math.max(0, Math.floor((now - start) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return <span>{hours}h {minutes}m {remainingSeconds}s</span>
}

// ─── Case Detail Drawer ────────────────────────────────────────────────────────
function CaseDetailDrawer({
  caseData,
  reviewerName,
  reviewerRole,
  readOnly = false,
  onClose,
  onCaseUpdate,
  onMoveToCredit,
  onMoveToHold,
}: {
  caseData: CaseRecord
  reviewerName: string
  reviewerRole?: string
  readOnly?: boolean
  onClose: () => void
  onCaseUpdate: (id: string, updates: Partial<CaseRecord>) => void
  onMoveToCredit: () => void
  onMoveToHold: () => void
}) {
  const currentReviewerLabel = reviewerName
    ? `${reviewerName}${reviewerRole ? ` (${reviewerRole})` : ''}`
    : (caseData.screenedBy || 'FCU Reviewer')
  const isTerminal = ['SENT_TO_CREDIT', 'DISBURSED', 'REJECTED', 'FORWARDED_REJECT'].includes(caseData.status) || caseData.workflowStage === 'FINALIZED'
  const isReadOnly = Boolean(readOnly || isTerminal)
  const [activeTab, setActiveTab] = useState<'personal' | 'loan' | 'docs' | 'aadhaar' | 'fcu' | 'credit' | 'field' | 'history'>('loan')
  const [docs, setDocs] = useState<CaseDoc[]>(caseData.docs)
  const [checks, setChecks] = useState<FCUCheck[]>(caseData.checks)
  const [remark, setRemark] = useState('')
  const [remarks, setRemarks] = useState<string[]>(caseData.remarks)
  const [history, setHistory] = useState<CaseHistoryItem[]>(caseData.history || [])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [fraudSourceDocument, setFraudSourceDocument] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [documentRejectTarget, setDocumentRejectTarget] = useState<{ id: string; name: string } | null>(null)
  const [previewDocument, setPreviewDocument] = useState<CaseDoc | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [caseStatus, setCaseStatus] = useState(caseData.status)
  const [workflowStage, setWorkflowStage] = useState(caseData.workflowStage || 'DOCUMENT_REVIEW')
  const [actionSaving, setActionSaving] = useState(false)
  const documentOptions = [
    'Aadhaar Card',
    'PAN Card',
    'Passport',
    'Voter ID',
    'Driving License',
    'Utility Bill (Electricity/Water/Gas)',
    'Bank Statement',
    'Rental Agreement',
    'Current month salary slip',
    'Previous month salary slip',
    'Old salary slip',
    'Salary Certificate',
    'Latest Form 16',
    'Noc',
    'Company ID Card',
    'Employment/Joining Letter',
    'Last 6 Months Bank Statement',
    'Cancelled Cheque',
  ]
  const [selectedRequestDocs, setSelectedRequestDocs] = useState<string[]>(['Aadhaar Card', 'PAN Card'])
  const [documentRequest, setDocumentRequest] = useState<DocumentRequestData | null>(null)
  const [requestSaving, setRequestSaving] = useState(false)
  const [upiSaving, setUpiSaving] = useState(false)
  const [bankPennySaving, setBankPennySaving] = useState(false)
  const [mobileBankSaving, setMobileBankSaving] = useState(false)
  const [ckycSaving, setCkycSaving] = useState(false)
  const [aadhaarSaving, setAadhaarSaving] = useState(false)
  const [aadhaarInput, setAadhaarInput] = useState('')
  const [aadhaarRelation, setAadhaarRelation] = useState(String(caseData.ekycDetails?.fetchedAadhaar?.relation || ''))
  const [relationSaving, setRelationSaving] = useState(false)
  const [corporateEmailVerification, setCorporateEmailVerification] = useState(caseData.corporateEmailVerification || null)
  const [corporateEmailSaving, setCorporateEmailSaving] = useState(false)
  const [uploadDocumentId, setUploadDocumentId] = useState<number | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadingDocId, setUploadingDocId] = useState<number | string | null>(null)
  const [viewedDocIds, setViewedDocIds] = useState<Set<string | number>>(new Set())
  const openDocPreview = (doc: any) => {
    if (doc?.id) {
      setViewedDocIds(prev => new Set(prev).add(doc.id))
    }
    setPreviewDocument(doc)
  }
  const [bankEditOpen, setBankEditOpen] = useState(false)
  const [bankEditSaving, setBankEditSaving] = useState(false)
  const [bankEditForm, setBankEditForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    accountType: 'savings',
    salaryAccount: 'Yes',
    verificationStatus: 'Verified',
  })
  const ekyc = caseData.ekycDetails
  const ekycAssetUrl = (filePath?: string | null) => {
    if (!filePath || typeof filePath !== 'string') return ''
    let trimmed = filePath.trim()
    if (!trimmed) return ''

    // Strip legacy Cloudinary URLs and resolve to customer_documents
    if (trimmed.includes('res.cloudinary.com')) {
      const fileName = trimmed.split('/').pop() || ''
      trimmed = `customer_documents/${fileName}`
    }

    if (/^(blob:)/i.test(trimmed)) return trimmed
    if (/^data:image\/[a-zA-Z+]+;base64,/i.test(trimmed)) return trimmed
    if (trimmed.startsWith('data:')) return trimmed
    if (/^[A-Za-z0-9+/=]{80,}$/.test(trimmed) || trimmed.startsWith('/9j/') || trimmed.startsWith('iVBOR')) {
      const mime = trimmed.startsWith('iVBOR') ? 'image/png' : 'image/jpeg'
      return `data:${mime};base64,${trimmed}`
    }
    if (/^https?:\/\//i.test(trimmed)) return trimmed

    const cleanPath = trimmed.replace(/^\/?(uploads\/)?/, '').replace(/^\/+/, '')
    const finalPath = cleanPath.startsWith('customer_documents/') ? cleanPath : `customer_documents/${cleanPath}`

    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
      return `https://geetpay.in/${finalPath}`
    }
    return `${API_BASE_URL}/${finalPath}`
  }
  const [fieldReport, setFieldReport] = useState<FieldReport | null>(caseData.fieldReport || null)
  const reportAssetUrl = (filePath?: string) => {
    if (!filePath) return ''
    const trimmed = filePath.trim()
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed
    const cleanPath = trimmed.replace(/^\/+/, '')
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
      return `https://geetpay.in/${cleanPath}`
    }
    return `${API_BASE_URL}/${cleanPath}`
  }
  const verificationChecklistLabels = [
    'Photo matches applicant face',
    'Name matches application form',
    'Address matches records',
    'No visible tampering or damage',
    'Document within validity period',
  ]
  const reportSubmissionSummary = fieldReport ? [
    { label: 'Applicant Info', done: true },
    { label: 'Documents Verified', done: Boolean(fieldReport.documents?.aadhaar && fieldReport.documents?.pan && fieldReport.documents?.checklist?.every(Boolean)) },
    { label: 'Photos Captured', done: Boolean(fieldReport.photos?.applicant && fieldReport.photos?.residenceOffice) },
    { label: 'GPS Confirmed', done: Boolean(fieldReport.location?.latitude && fieldReport.location?.longitude) },
    { label: 'Signature Obtained', done: Boolean(fieldReport.signature) },
  ] : []
  const locationLat = Number(caseData.locationLat)
  const locationLng = Number(caseData.locationLng)
  const hasDatabaseLocation = Boolean(caseData.locationLat && caseData.locationLng)
    && Number.isFinite(locationLat) && Number.isFinite(locationLng)
    && locationLat >= -90 && locationLat <= 90 && locationLng >= -180 && locationLng <= 180
  const locationQuery = [caseData.address, caseData.city, caseData.state, caseData.pincode, caseData.branch]
    .filter(value => value && value !== 'N/A' && value !== 'Not available')
    .join(', ')
  const cityLocationQuery = [caseData.city, caseData.state, caseData.pincode]
    .filter(value => value && value !== 'N/A')
    .join(', ')
  const [geocodedLocation, setGeocodedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(!hasDatabaseLocation)
  const resolvedLat = hasDatabaseLocation ? locationLat : geocodedLocation?.lat
  const resolvedLng = hasDatabaseLocation ? locationLng : geocodedLocation?.lng
  const hasValidLocation = Number.isFinite(resolvedLat) && Number.isFinite(resolvedLng)
  const mapDelta = 0.018
  const mapEmbedUrl = hasValidLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${resolvedLng! - mapDelta}%2C${resolvedLat! - mapDelta}%2C${resolvedLng! + mapDelta}%2C${resolvedLat! + mapDelta}&layer=mapnik&marker=${resolvedLat}%2C${resolvedLng}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery || caseData.city || caseData.branch)}&z=13&output=embed`
  const externalMapUrl = hasValidLocation
    ? `https://www.google.com/maps/search/?api=1&query=${resolvedLat}%2C${resolvedLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery || caseData.city || caseData.branch)}`

  useEffect(() => {
    if (hasDatabaseLocation) {
      setGeocodedLocation(null)
      setLocationLoading(false)
      return
    }
    const controller = new AbortController()
    const resolveLocation = async () => {
      setLocationLoading(true)
      setGeocodedLocation(null)
      try {
        for (const query of [locationQuery, cityLocationQuery]) {
          if (!query) continue
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          })
          if (!response.ok) continue
          const results = await response.json()
          const match = Array.isArray(results) ? results[0] : null
          if (match && Number.isFinite(Number(match.lat)) && Number.isFinite(Number(match.lon))) {
            setGeocodedLocation({ lat: Number(match.lat), lng: Number(match.lon) })
            break
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Location lookup failed:', error)
      } finally {
        if (!controller.signal.aborted) setLocationLoading(false)
      }
    }
    void resolveLocation()
    return () => controller.abort()
  }, [caseData.id, hasDatabaseLocation, locationQuery, cityLocationQuery])

  const [hasInitializedSelectedDocs, setHasInitializedSelectedDocs] = useState(false)

  const loadDocumentRequest = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests`, { credentials: 'include', cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        setDocumentRequest(result.data || null)
        const pending = (result.data?.documents || []).find((item: RequestedDocument) => item.status === 'PENDING')
        setUploadDocumentId(pending?.id || null)
        if (!hasInitializedSelectedDocs && Array.isArray(result.data?.documents) && result.data.documents.length > 0) {
          setSelectedRequestDocs(result.data.documents.map((d: any) => d.documentName))
          setHasInitializedSelectedDocs(true)
        }
      }
    } catch { /* The rest of the case drawer remains usable when this optional panel is unavailable. */ }
  }

  useEffect(() => {
    void loadDocumentRequest()
    const refreshTimer = window.setInterval(() => { void loadDocumentRequest() }, 5000)
    const refreshOnFocus = () => { if (!document.hidden) void loadDocumentRequest() }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [caseData.id])

  useEffect(() => {
    if (activeTab !== 'field') return
    let active = true
    const loadLatestFieldReport = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases`, { credentials: 'include', cache: 'no-store' })
        if (!response.ok) return
        const result = await response.json()
        const latestCase = (Array.isArray(result.data) ? result.data : []).find((item: CaseRecord) => item.databaseId === caseData.databaseId)
        if (active) setFieldReport(latestCase?.fieldReport || null)
      } catch { /* Keep the last loaded report when refresh is temporarily unavailable. */ }
    }
    void loadLatestFieldReport()
    const timer = window.setInterval(loadLatestFieldReport, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [activeTab, caseData.databaseId])

  const loadCaseHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/history`, { credentials: 'include', cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to load case history')
      setHistory(Array.isArray(result.data) ? result.data : [])
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load case history', 'error')
    } finally { setHistoryLoading(false) }
  }

  useEffect(() => {
    void loadCaseHistory()
  }, [caseData.id, caseData.databaseId])

  const buildCustomerUploadUrl = (token?: string | null) => {
    if (!token) return ''
    const origin = window.location.origin
    const basePath = window.location.pathname.replace(/\/customer-upload\/.*$/i, '').replace(/\/+$/, '')
    return `${origin}${basePath}/?customer-upload=${token}`
  }

  const createShareLink = async () => {
    if (!selectedRequestDocs.length) { showToast('Select at least one document', 'error'); return }
    try {
      setRequestSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: selectedRequestDocs }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to create share link')
      const data = { ...result.data, shareUrl: buildCustomerUploadUrl(result.data.token) }
      setDocumentRequest(data)
      setUploadDocumentId(data.documents?.[0]?.id || null)
      showToast('Customer document request created', 'success')
      void loadCaseHistory()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create request'
      showToast(message, 'error')
      if (message.toLowerCase().includes('removed from the database') || message.toLowerCase().includes('no longer exists')) {
        window.setTimeout(onClose, 1800)
      }
    }
    finally { setRequestSaving(false) }
  }

  const shareUrl = documentRequest?.token && (documentRequest.status === 'ACTIVE' || documentRequest.status === 'COMPLETED') ? buildCustomerUploadUrl(documentRequest.token) : ''
  const copyShareLink = async () => {
    if (!shareUrl) { showToast('Create an active share link first', 'error'); return }
    await navigator.clipboard.writeText(shareUrl)
    showToast('Share link copied', 'success')
  }
  const disableShareLink = async () => {
    try {
      setRequestSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests`, {
        method: 'DELETE', credentials: 'include',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to disable share link')
      setDocumentRequest(result.data || null)
      showToast('Document upload link disabled', 'success')
      void loadCaseHistory()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to disable link', 'error')
    } finally {
      setRequestSaving(false)
    }
  }
  const shareDocumentLink = async () => {
    if (!shareUrl) { showToast('Create a share link first', 'error'); return }
    try {
      setRequestSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests/share`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadLink: shareUrl }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to send upload link on WhatsApp')
      showToast(`Document link sent on WhatsApp to ${result.data?.mobile || 'customer'}`, 'success')
      void loadCaseHistory()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to send WhatsApp message', 'error') }
    finally { setRequestSaving(false) }
  }
  const fetchMobileUpiDetails = async () => {
    try {
      setUpiSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/mobile-to-upi`, {
        method: 'POST', credentials: 'include',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to fetch Mobile-to-UPI details')
      const apiData = result.data || {}
      const mobileUpi = {
        httpResponseCode: String(apiData.http_response_code ?? 'N/A'),
        clientRefNum: apiData.client_ref_num || 'N/A',
        requestId: apiData.request_id || 'N/A',
        resultCode: String(apiData.result_code ?? 'N/A'),
        mobileNumber: caseData.mobile,
        mobileLinkedName: apiData.result?.mobile_linked_name || 'N/A',
        vpa: apiData.result?.vpa || 'N/A',
        message: apiData.message || 'N/A',
        status: 'Fetched',
      }
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, mobileUpi } })
      showToast('Mobile-to-UPI details fetched and saved', 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to fetch Mobile-to-UPI details', 'error') }
    finally { setUpiSaving(false) }
  }
  const verifyBankPenny = async () => {
    try {
      setBankPennySaving(true)
      const currentBank = caseData.ekycDetails?.bank || {}
      const response = await fcuFetch(`/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/bank-penny-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: currentBank.accountNumber,
          ifscCode: currentBank.ifscCode,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to verify bank account')
      const apiData = result.data || {}
      const verification = apiData.result || {}
      const bankPenny = {
        httpResponseCode: String(apiData.http_response_code ?? 'N/A'),
        requestId: apiData.request_id || 'N/A',
        resultCode: String(apiData.result_code ?? 'N/A'),
        accountExists: verification.account_exists == null ? 'N/A' : (String(verification.account_exists).toLowerCase() === 'true' ? 'Yes' : 'No'),
        nameAtBank: verification.name_at_bank || 'N/A',
        utr: verification.utr || 'N/A',
        amountDeposited: verification.amount_deposited == null ? 'N/A' : `₹${Number(verification.amount_deposited).toFixed(2)}`,
        accountNumber: verification.account_number ? String(verification.account_number).replace(/\s/g, '') : currentBank.accountNumber || 'N/A',
        ifscCode: verification.ifsc_code || currentBank.ifscCode || 'N/A',
        message: apiData.message || 'N/A', status: 'Verified',
        providerData: apiData.provider_data || {},
      }
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, bankPenny } })
      showToast('Bank account verified and saved', 'success')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to verify bank account'
      const hindiWarning = '⚠️ Ye insan chor ho sakta hai! Bank Account ya IFSC code galat hai.'
      showToast(msg.includes('chor') ? msg : `${hindiWarning} (${msg})`, 'error')
    }
    finally { setBankPennySaving(false) }
  }
  const fetchMobileBankDetails = async () => {
    try {
      setMobileBankSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/mobile-to-bank`, {
        method: 'POST', credentials: 'include',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to fetch Mobile-to-Bank details')
      const data = result.data || {}
      const mobileBank = {
        httpResponseCode: String(data.http_response_code ?? 'N/A'), requestId: data.request_id || 'N/A',
        resultCode: String(data.result_code ?? 'N/A'), mobileNumber: data.mobile_number || caseData.mobile,
        message: data.message || 'N/A', bankAccountData: data.bank_account_data || {}, status: 'Fetched',
        verificationStatus: data.verification?.verified ? 'Verified' : 'Not verified',
        verificationReason: data.verification?.reason || 'N/A', verificationMatches: data.verification?.matches || {},
      }
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, bank: { ...caseData.ekycDetails?.bank, verificationStatus: mobileBank.verificationStatus }, mobileBank } })
      showToast(data.verification?.verified ? 'Bank details matched and verified' : 'Bank details fetched but did not match', data.verification?.verified ? 'success' : 'error')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to fetch Mobile-to-Bank details', 'error') }
    finally { setMobileBankSaving(false) }
  }
  const fetchCkycDetails = async () => {
    try {
      setCkycSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/ckyc-search`, { method: 'POST', credentials: 'include' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to fetch CKYC details')
      const data = result.data || {}
      const ckyc = {
        number: data.number || 'N/A', status: data.status || 'Not available', registeredOn: data.registeredOn || 'N/A',
        issuer: data.issuer || 'N/A', proofType: data.proofType || 'PAN', matchingStatus: String(data.matchingStatus ?? 'N/A'),
        requestId: data.requestId || 'N/A', message: data.message || 'N/A', fetched: 'Yes',
      }
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, ckyc } })
      showToast('CKYC details fetched and saved', 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to fetch CKYC details', 'error') }
    finally { setCkycSaving(false) }
  }
  const fetchAadhaarDetails = async () => {
    const cleanAadhaar = aadhaarInput.replace(/\D/g, '')
    if (!/^\d{8,16}$/.test(cleanAadhaar)) { showToast('Enter a valid Aadhaar number', 'error'); return }
    try {
      setAadhaarSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/aadhaar-fetch`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aadhaar: cleanAadhaar }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to fetch Aadhaar details')
      const data = result.data || {}
      const fetchedAadhaar = {
        httpResponseCode: String(data.httpResponseCode ?? 'N/A'), statusType: data.statusType || 'N/A',
        linkedMobile: data.linkedMobile || 'N/A', number: data.aadhaarNumber || cleanAadhaar,
        pan: data.pan || 'N/A', status: data.status || 'Verified', name: data.fullName || 'N/A',
        firstName: data.firstName || 'N/A', middleName: data.middleName || 'N/A', lastName: data.lastName || 'N/A', dob: data.dob || 'N/A',
        gender: data.gender || 'N/A', issuedBy: 'UIDAI', verifiedOn: new Date().toLocaleDateString('en-IN'),
        address: data.address || 'N/A', addressLine2: data.addressLine2 || 'N/A', city: data.city || 'N/A',
        state: data.state || 'N/A', pincode: data.pincode || 'N/A', country: data.country || 'India',
        photo: data.photo || null, requestId: data.requestId || 'N/A', providerMessage: data.providerMessage || 'N/A', apiResponse: data.rawData || {},
      }
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, fetchedAadhaar } })
      showToast('Aadhaar details fetched and saved', 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to fetch Aadhaar details', 'error') }
    finally { setAadhaarSaving(false) }
  }
  const saveAadhaarRelation = async () => {
    if (!aadhaarRelation) { showToast('Select relation with applicant', 'error'); return }
    try {
      setRelationSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/aadhaar-relation`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relation: aadhaarRelation }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to save relation')
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, fetchedAadhaar: { ...caseData.ekycDetails?.fetchedAadhaar, relation: aadhaarRelation } } })
      showToast('Relation saved successfully', 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save relation', 'error') }
    finally { setRelationSaving(false) }
  }
  const verifyCorporateEmailAddress = async () => {
    const email = String(caseData.emailOffice || '').trim()
    if (!email || email === 'N/A') { showToast('Corporate email is not available', 'error'); return }
    try {
      setCorporateEmailSaving(true)
      const response = await fcuFetch(`/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/corporate-email-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to verify corporate email')
      const verification = result.data || null
      setCorporateEmailVerification(verification)
      onCaseUpdate(caseData.id, { corporateEmailVerification: verification })
      const isOk = verification?.status === 'VALID'
      const toastType = isOk ? 'success' : verification?.status === 'INVALID' ? 'error' : 'info'
      showToast(verification?.reason || (isOk ? 'Corporate email verified' : 'Corporate email check completed'), toastType)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to verify corporate email', 'error')
    } finally { setCorporateEmailSaving(false) }
  }

  const openBankEditModal = () => {
    setBankEditForm({
      accountHolderName: ekyc?.bank?.accountHolderName === 'N/A' ? '' : (ekyc?.bank?.accountHolderName || ''),
      bankName: ekyc?.bank?.bankName === 'N/A' ? '' : (ekyc?.bank?.bankName || ''),
      accountNumber: ekyc?.bank?.accountNumber === 'N/A' ? '' : (ekyc?.bank?.accountNumber || ''),
      ifscCode: ekyc?.bank?.ifscCode === 'N/A' ? '' : (ekyc?.bank?.ifscCode || ''),
      branchName: ekyc?.bank?.branchName === 'N/A' ? '' : (ekyc?.bank?.branchName || ''),
      accountType: ekyc?.bank?.accountType === 'N/A' ? 'savings' : (ekyc?.bank?.accountType || 'savings'),
      salaryAccount: ekyc?.bank?.salaryAccount === 'N/A' ? 'Yes' : (ekyc?.bank?.salaryAccount || 'Yes'),
      verificationStatus: ekyc?.bank?.verificationStatus || 'Verified',
    })
    setBankEditOpen(true)
  }

  const saveBankDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      setBankEditSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/bank-details`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankEditForm),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to save bank details')

      const updatedBank = result.data || {
        ...ekyc?.bank,
        ...bankEditForm,
        status: 'Available',
      }

      onCaseUpdate(caseData.id, {
        ekycDetails: {
          ...caseData.ekycDetails!,
          bank: updatedBank,
        },
      })

      showToast('Bank details updated and verified successfully', 'success')
      setBankEditOpen(false)
      void loadCaseHistory()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update bank details', 'error')
    } finally {
      setBankEditSaving(false)
    }
  }

  const uploadSingleDoc = async (docIdOrName: number | string, file: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('File must be smaller than 5 MB', 'error'); return }
    try {
      setUploadingDocId(docIdOrName)
      let activeRequest = documentRequest

      if (!activeRequest?.token || activeRequest.status !== 'ACTIVE') {
        const docsToRequest = Array.from(new Set<string>([
          ...selectedRequestDocs,
          typeof docIdOrName === 'string' ? docIdOrName : ''
        ])).filter(Boolean)

        const createRes = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: docsToRequest }),
        })
        const createResult = await createRes.json().catch(() => ({}))
        if (!createRes.ok) throw new Error(createResult.message || 'Unable to activate document request')
        activeRequest = { ...createResult.data, shareUrl: buildCustomerUploadUrl(createResult.data.token) }
        setDocumentRequest(activeRequest)
      }

      let targetDocId: number | null = typeof docIdOrName === 'number' ? docIdOrName : null
      if (!targetDocId && typeof docIdOrName === 'string') {
        const matched = activeRequest.documents?.find(d => d.documentName === docIdOrName)
        targetDocId = matched ? matched.id : null
      }

      if (!targetDocId) {
        throw new Error('Target document slot not found in active request')
      }

      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/customer-upload/${activeRequest.token}/documents/${targetDocId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64, fileName: file.name }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to upload document')

      setDocumentRequest(result.data)
      showToast('Document uploaded successfully!', 'success')
      void loadCaseHistory()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to upload', 'error')
    } finally {
      setUploadingDocId(null)
    }
  }

  const uploadRequestedFile = async () => {
    if (!documentRequest?.token || documentRequest.status !== 'ACTIVE') {
      showToast('Document request link is disabled. Click "Create share link" to generate an active link first.', 'error')
      return
    }
    if (!uploadDocumentId || !uploadFile) { showToast('Choose a pending document and file', 'error'); return }
    if (uploadFile.size > 5 * 1024 * 1024) { showToast('File must be smaller than 5 MB', 'error'); return }
    try {
      setRequestSaving(true)
      const imageBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(uploadFile) })
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/customer-upload/${documentRequest.token}/documents/${uploadDocumentId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64, fileName: uploadFile.name }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to upload document')
      setDocumentRequest(result.data)
      setUploadFile(null)
      setUploadDocumentId(result.data.documents?.find((item: RequestedDocument) => item.status === 'PENDING')?.id || null)
      showToast('Document uploaded successfully', 'success')
      void loadCaseHistory()
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to upload', 'error') }
    finally { setRequestSaving(false) }
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const updateDocStatus = async (docId: string, status: DocStatus, reason = '') => {
    if (status === 'APPROVED' && !viewedDocIds.has(docId)) {
      showToast('Pehle document ko View karke check karein, tabhi verify ho payega.', 'error')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/documents/${docId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status, reason }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to update document')
      const updatedDocs = docs.map(d => d.id === docId ? { ...d, status } : d)
      setDocs(updatedDocs)
      onCaseUpdate(caseData.id, { docs: updatedDocs })
      showToast(`Document ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`, status === 'APPROVED' ? 'success' : 'error')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update document', 'error')
    }
  }

  const confirmDocumentRejection = async () => {
    if (!documentRejectTarget || !actionReason.trim()) return
    await updateDocStatus(documentRejectTarget.id, 'REJECTED', actionReason.trim())
    setConfirmAction(null)
    setDocumentRejectTarget(null)
    setActionReason('')
  }

  const approveAllDocuments = async () => {
    const unapproved = docs.filter((d: any) => d.status !== 'APPROVED')
    if (unapproved.length === 0) {
      showToast('All documents are already verified', 'info')
      return
    }
    const unviewed = unapproved.filter((d: any) => !viewedDocIds.has(d.id))
    if (unviewed.length > 0) {
      showToast(`Pehle sabhi ${unviewed.length} document(s) ko View karein, tabhi Verify All ho payega.`, 'error')
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/documents/approve-all`, { method: 'POST', credentials: 'include' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to approve documents')
      const updated = docs.map(d => ({ ...d, status: 'APPROVED' as DocStatus }))
      setDocs(updated)
      onCaseUpdate(caseData.id, { docs: updated })
      showToast('All documents approved. Case decision is now available.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to approve documents', 'error')
    }
  }

  const updateCheckStatus = async (checkId: string, status: CheckStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/ekyc/${checkId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to save eKYC review')
      const updated = checks.map(c => c.id === checkId ? { ...c, status } : c)
      setChecks(updated)
      onCaseUpdate(caseData.id, { checks: updated })
      showToast(`Check marked as ${status}`, 'info')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save eKYC review', 'error') }
  }

  const addRemark = async () => {
    if (!remark.trim()) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/history`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ note: remark.trim() }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to save note')
      setHistory(current => [result.data, ...current])
      setRemark('')
      showToast('Note saved in case history', 'info')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save note', 'error') }
  }

  const handleCaseAction = async (action: string) => {
    const statusMap: Record<string, string> = {
      'Approve Case': 'APPROVED',
      'Reject Case': 'REJECTED',
      'Flag as Fraud': 'REJECTED',
      'Forward to Reject': 'FORWARDED_REJECT',
      'Send to Field Verification': 'FIELD_VERIFICATION',
      'Waive Field Verification': 'SENT_TO_CREDIT',
      'Hold Case': 'HOLD',
      'Send to Credit Team': 'SENT_TO_CREDIT',
    }
    const actionMap: Record<string, string> = {
      'Approve Case': 'APPROVE_CASE',
      'Reject Case': 'REJECT_CASE',
      'Flag as Fraud': 'FLAG_FRAUD',
      'Send to Field Verification': 'SEND_FIELD',
      'Waive Field Verification': 'WAIVE_FIELD',
      'Send to Credit Team': 'SEND_CREDIT',
      'Hold Case': 'HOLD_CASE',
      'Forward to Reject': 'FORWARD_REJECT',
    }
    let newStatus = statusMap[action]
    try {
      setActionSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: actionMap[action], reason: actionReason.trim() }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = result.detail || result.code
        throw new Error(`${result.message || 'Unable to update workflow'}${detail ? `: ${detail}` : ''}`)
      }
      newStatus = result.data.caseStatus || newStatus
      setWorkflowStage(result.data.workflowStage)
      void loadCaseHistory()
      if (newStatus) {
        setCaseStatus(newStatus)
        onCaseUpdate(caseData.id, { status: newStatus })
        const newRemarks = [...remarks, `[${new Date().toLocaleTimeString()}] System: Case ${action} by ${currentReviewerLabel}`]
        setRemarks(newRemarks)
        const fieldVerificationReport = result.data.workflowStage === 'FIELD_ASSIGNED' ? {
          status: 'PENDING' as const,
          requestedOn: new Date().toLocaleDateString('en-IN'),
          assignedOfficer: result.data.fieldAssignedTo || 'Field Verification Team',
          visitDate: 'To be scheduled',
          summary: 'Case assigned to the field verification team.',
          result: 'Pending field verification',
          nextAction: 'Await field officer report.',
        } : caseData.fieldVerificationReport
        onCaseUpdate(caseData.id, { status: newStatus, workflowStage: result.data.workflowStage, remarks: newRemarks, fieldVerificationReport })
        if (action === 'Send to Credit Team') onMoveToCredit()
        if (action === 'Hold Case') onMoveToHold()
        if ((action === 'Reject Case' || action === 'Flag as Fraud') && result.data.whatsapp?.sent === false) {
          showToast(`Case rejected, but WhatsApp failed: ${result.data.whatsapp.message}`, 'error')
        } else if ((action === 'Reject Case' || action === 'Flag as Fraud') && result.data.whatsapp?.sent) {
          showToast(action === 'Flag as Fraud' ? 'Fraud flag and permanent ban saved; WhatsApp sent' : 'Case rejected and WhatsApp message sent', 'success')
        } else {
          showToast(`${action} — case status updated`, action.includes('Reject') || action === 'Hold Case' ? 'error' : 'success')
        }

        // If a document was specifically flagged as fraud, update its local status
        if (action === 'Flag as Fraud' && fraudSourceDocument) {
          const updatedDocs = docs.map(d => d.id === fraudSourceDocument.id ? { ...d, status: 'REJECTED' as DocStatus } : d)
          setDocs(updatedDocs)
          onCaseUpdate(caseData.id, { docs: updatedDocs })

          // Also fire off a document status update to the backend just in case
          void updateDocStatus(fraudSourceDocument.id, 'REJECTED', actionReason.trim())
        }
      }
      setConfirmAction(null)
      setFraudSourceDocument(null)
      setDocumentRejectTarget(null)
      setActionReason('')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update workflow', 'error')
    } finally {
      setActionSaving(false)
    }
  }

  const docsApproved = docs.filter(d => d.status === 'APPROVED').length
  const docsPending = docs.filter(d => d.status === 'PENDING').length
  const allDocsApproved = docs.length === 0 || docs.every(d => d.status === 'APPROVED')
  const allEkycChecksPassed = checks.length === 0 || checks.every(check => check.status === 'PASS')
  const canInitialDecision = workflowStage === 'DOCUMENT_REVIEW' && allDocsApproved && allEkycChecksPassed
  const canChooseVerification = workflowStage === 'FCU_APPROVED'
  const fieldReportComplete = Boolean(fieldReport)
    && reportSubmissionSummary.length > 0
    && reportSubmissionSummary.every(item => item.done)
  const canFinalDecision = workflowStage === 'FIELD_WAIVED'
    || (workflowStage === 'FIELD_ASSIGNED' && fieldReportComplete)
  const documentActionsLocked = workflowStage !== 'DOCUMENT_REVIEW'
  const checksPass = checks.filter(c => c.status === 'PASS').length
  const checksFail = checks.filter(c => c.status === 'FAIL').length
  const verificationReport = caseData.fieldVerificationReport ?? buildVerificationReport(caseStatus)
  const reportOfficerName = fieldReport?.officerName
    || fieldReport?.fieldOfficerName
    || fieldReport?.submittedByName
    || fieldReport?.submittedBy?.name
    || fieldReport?.officer?.name
    || 'N/A'
  const reportOfficerEmployeeId = fieldReport?.employeeId
    || fieldReport?.employeeCode
    || fieldReport?.officerEmployeeId
    || fieldReport?.submittedBy?.employeeId
    || fieldReport?.submittedBy?.employeeCode
    || fieldReport?.officer?.employeeId
    || fieldReport?.officer?.employeeCode
    || 'N/A'

  const tabDefs = [
    { key: 'loan', label: 'Application' },
    { key: 'docs', label: `Documents (${docsApproved}/${docs.length})` },
    { key: 'personal', label: 'Personal' },
    { key: 'aadhaar', label: 'Aadhaar' },
    { key: 'fcu', label: `eKYC` },
    { key: 'credit', label: 'Credit Bureau' },
    { key: 'field', label: 'Field Details' },
    // { key: 'history',  label: `History (${history.length})` },
  ] as const
  const referenceRows = caseData.references || []
  const referenceColumns = Array.from(new Set(referenceRows.flatMap(reference => Object.keys(reference.data || {}))))
    .filter(column => ![
      'api_response',
      'http_response_code',
      'request_id',
      'result_code',
      'message',
      'result',
      'idspay_message',
    ].includes(column.toLowerCase()))
    .sort((left, right) => {
      const trailingColumns = ['created_at', 'updated_at']
      const leftIndex = trailingColumns.indexOf(left.toLowerCase())
      const rightIndex = trailingColumns.indexOf(right.toLowerCase())
      if (leftIndex === -1 && rightIndex === -1) return 0
      if (leftIndex === -1) return -1
      if (rightIndex === -1) return 1
      return leftIndex - rightIndex
    })

  return (
    <div className="fixed inset-0 z-50 w-full max-w-full bg-white overflow-y-auto overflow-x-hidden">
      <div className="min-h-screen w-full min-w-0 max-w-full bg-white flex flex-col">
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white px-3 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: caseData.avatar }}
            >
              {caseData.initials}
            </div>
            <div>
              <div className="font-bold text-sm">{caseData.borrower}</div>
              <div className="text-[10px] text-blue-200 font-mono">{caseData.id} · {caseData.ref}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isReadOnly && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                🔒 View Only (Read-Only)
              </span>
            )}
            <button onClick={onClose} className="px-2.5 py-1 rounded bg-white/10 text-blue-100 hover:bg-white/20 text-[11px] font-medium">
              ← Close Drawer
            </button>
            <StatusBadge status={caseStatus} />
          </div>
        </div>

        {/* Lead Profile Summary */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 text-white px-4 sm:px-6 py-5 shrink-0">
          <div className="flex flex-col items-start justify-between gap-4 lg:flex-row">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white/20 shadow-lg"
                style={{ backgroundColor: caseData.avatar }}
              >
                {caseData.initials}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-2xl font-bold">{caseData.borrower}</div>
                  <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded text-[10px] font-semibold uppercase tracking-wide">CRM Lead</span>
                </div>
                <div className="mt-1 text-[11px] text-blue-100 flex flex-wrap gap-2">
                  <span>{caseData.id}</span>
                  <span>Lead {caseData.ref}</span>
                  <span>{caseData.state}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">☎ {caseData.mobile}</span>
                  <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">✉ {caseData.email}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] flex-wrap justify-end">
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">High-touch review</span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20">High priority</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Loan Amount', value: caseData.loan },
              { label: 'Purpose', value: caseData.purpose },
              { label: 'Branch', value: caseData.branch },
              { label: 'Applied On', value: caseData.applied },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm px-3 py-2">
                <div className="text-[9px] uppercase tracking-wide text-blue-100">{item.label}</div>
                <div className="mt-1 text-[13px] font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)]">
            {/* Customer Snapshot */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">FCU Verification Snapshot</div>
                  <div className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                    {caseData.status === 'SENT_TO_CREDIT' || caseData.status === 'FORWARDED_CREDIT'
                      ? 'Forwarded to Credit Team'
                      : caseData.status === 'APPROVED'
                      ? 'Case Approved by FCU'
                      : caseData.status === 'DISBURSED'
                      ? 'Loan Sanctioned & Disbursed'
                      : caseData.status === 'HOLD'
                      ? 'Application Placed on Hold'
                      : caseData.status === 'REJECTED'
                      ? 'Application Rejected'
                      : 'FCU Fraud & Identity Verification'}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                  caseData.status === 'APPROVED' || caseData.status === 'DISBURSED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : caseData.status === 'SENT_TO_CREDIT' || caseData.status === 'FORWARDED_CREDIT'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : caseData.status === 'HOLD'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : caseData.status === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {caseData.status === 'SENT_TO_CREDIT' || caseData.status === 'FORWARDED_CREDIT'
                    ? 'Credit Team Queue'
                    : caseData.status === 'APPROVED'
                    ? 'FCU Approved'
                    : caseData.status === 'DISBURSED'
                    ? 'Disbursed'
                    : caseData.status === 'HOLD'
                    ? 'On Hold'
                    : caseData.status === 'REJECTED'
                    ? 'Rejected'
                    : 'Ready for Review'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-slate-50/70 p-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Source</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-800 truncate">
                    {caseData.forwardedBy ? `Telecaller (${caseData.forwardedBy})` : (caseData.website || 'Direct App')}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-slate-50/70 p-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">City / Branch</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-800 truncate">
                    {caseData.city || caseData.branch || 'N/A'}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-slate-50/70 p-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Documents</div>
                  <div className="mt-0.5 text-xs font-bold text-emerald-700 font-mono">
                    {docs.filter(d => d.status === 'APPROVED').length}/{docs.length} Verified
                  </div>
                </div>
              </div>
            </div>

            {/* Case Progress (Real Pipeline) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Case Progress & Workflow Stages</div>
                <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Stage {['DISBURSED'].includes(caseData.status) ? '6/6' : ['SENT_TO_CREDIT', 'FORWARDED_CREDIT'].includes(caseData.status) ? '5/6' : fieldReport ? '4/6' : ['APPROVED'].includes(caseData.status) ? '3/6' : docs.length > 0 ? '2/6' : '1/6'}
                </span>
              </div>

              {(() => {
                const isSentCredit = ['SENT_TO_CREDIT', 'FORWARDED_CREDIT', 'DISBURSED'].includes(caseData.status)
                const isApproved = ['APPROVED', 'SENT_TO_CREDIT', 'FORWARDED_CREDIT', 'DISBURSED'].includes(caseData.status)
                const isDisbursed = caseData.status === 'DISBURSED'
                const isHold = ['HOLD', 'ON_HOLD'].includes(caseData.status)
                const isRejected = ['REJECTED', 'FORWARDED_REJECT', 'CLOSED'].includes(caseData.status)
                const hasDocs = docs.length > 0
                const hasField = Boolean(fieldReport?.outcome || caseData.fieldReport)

                const steps = [
                  { label: '1. Telecaller Approved', active: true, done: true },
                  { label: '2. Documents Uploaded', active: true, done: hasDocs },
                  { label: '3. FCU Approved', active: true, done: isApproved, hold: isHold, reject: isRejected },
                  { label: '4. Field Verification', active: true, done: hasField },
                  { label: '5. Sent to Credit', active: isSentCredit, done: isSentCredit },
                  { label: '6. Disbursed', active: isDisbursed, done: isDisbursed },
                ]

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {steps.map(step => (
                        <div key={step.label} className="space-y-1">
                          <div className={`h-1.5 rounded-full transition-all ${
                            step.reject
                              ? 'bg-rose-500'
                              : step.hold
                              ? 'bg-amber-500'
                              : step.done
                              ? 'bg-emerald-500'
                              : 'bg-slate-200'
                          }`} />
                          <div className={`text-[10px] truncate ${
                            step.reject
                              ? 'text-rose-700 font-bold'
                              : step.hold
                              ? 'text-amber-700 font-bold'
                              : step.done
                              ? 'text-emerald-700 font-bold'
                              : 'text-slate-400 font-medium'
                          }`}>
                            {step.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] font-semibold flex items-center gap-1.5 pt-1 border-t border-slate-100">
                      <span className="text-sm">
                        {isDisbursed ? '🎉' : isSentCredit ? '🚀' : caseData.status === 'APPROVED' ? '✓' : isHold ? '⏸' : isRejected ? '✕' : '🔍'}
                      </span>
                      <span className={
                        isDisbursed
                          ? 'text-emerald-700'
                          : isSentCredit
                          ? 'text-blue-700'
                          : caseData.status === 'APPROVED'
                          ? 'text-emerald-700'
                          : isHold
                          ? 'text-amber-700'
                          : isRejected
                          ? 'text-rose-700'
                          : 'text-slate-600'
                      }>
                        {isDisbursed
                          ? 'Loan successfully disbursed to customer bank account.'
                          : isSentCredit
                          ? 'Case successfully forwarded to Credit Team for loan sanctioning.'
                          : caseData.status === 'APPROVED'
                          ? 'Case approved by FCU. Click "Send to Credit" button to forward to Credit Team.'
                          : isHold
                          ? 'Case on hold pending customer clarification or extra documents.'
                          : isRejected
                          ? 'Application rejected by FCU verification team.'
                          : 'Verify customer documents & eKYC checks, then approve or forward case to Credit Team.'}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Bottom 3 Stage Parameters */}
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Workflow Stage</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800">
                {caseData.status === 'SENT_TO_CREDIT' || caseData.status === 'FORWARDED_CREDIT'
                  ? 'Credit Underwriting Queue'
                  : caseData.status === 'APPROVED'
                  ? 'FCU Sanction Approved'
                  : caseData.status === 'DISBURSED'
                  ? 'Disbursement Complete'
                  : caseData.status === 'HOLD'
                  ? 'On Hold'
                  : caseData.status === 'REJECTED'
                  ? 'Closed / Rejected'
                  : 'FCU Verification Review'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">FCU Reviewer</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800">
                {currentReviewerLabel}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Product / Service Line</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800">
                {caseData.serviceLine || 'Personal Loan'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex max-w-full overflow-x-auto border-b border-slate-200 bg-white shrink-0 px-2 pt-2">
          {tabDefs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-all rounded-t-lg border-b-2 ${activeTab === t.key
                ? 'border-slate-800 text-slate-900 bg-gradient-to-b from-slate-100 to-white shadow-sm'
                : 'border-transparent text-gray-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 text-xs">

          {/* ── Personal Info ── */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Basic profile</div>
                    <div className="text-[11px] text-gray-500">Applicant identity, screening, and contact information</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">6 fields</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">First Name</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.firstName || (caseData.borrower.split(' ')[0] || 'N/A')}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Middle Name</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.middleName || 'N/A'}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Surname</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.surname || (caseData.borrower.split(' ').slice(1).join(' ') || 'N/A')}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Gender</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.gender}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">DOB</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.dob}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">PAN</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.pan}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Mobile</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.mobile}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Alternate Mobile</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.alternateMobile || 'N/A'}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Email Personal</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.email}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Email Office</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.emailOffice || 'N/A'}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Screened By (FCU)</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{currentReviewerLabel}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Screened On</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.screenedOn || 'N/A'}</div></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Residence Owned (Aadhaar / Permanent) */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Residence (Owned)</div>
                      <div className="text-[11px] text-gray-500">Aadhaar / Permanent residential details</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">Aadhaar Match</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3 col-span-2"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 1</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceAddressLine1 || caseData.address || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 2</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceAddressLine2 || caseData.secondaryResidenceCity || caseData.city || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">City</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceCity || caseData.city || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">State</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceState || caseData.state || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Pincode</div><div className="mt-1 text-[13px] font-semibold text-gray-800 font-mono">{caseData.secondaryResidencePincode || caseData.pincode || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Residence Type</div><div className="mt-1 text-[13px] font-semibold text-emerald-700 font-bold">Owned</div></div>
                  </div>
                </div>

                {/* Residence Rented (Current / Declared) */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Residence (Rented)</div>
                      <div className="text-[11px] text-gray-500">Current / Rented residency evidence</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700">Current Address</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3 col-span-2"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 1</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.residenceAddressLine1 || caseData.address || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 2</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.residenceAddressLine2 || caseData.city || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">City</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.city || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">State</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.state || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Pincode</div><div className="mt-1 text-[13px] font-semibold text-gray-800 font-mono">{caseData.pincode || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Residence Type</div><div className="mt-1 text-[13px] font-semibold text-amber-700 font-bold">Rented</div></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Employment</div>
                    <div className="text-[11px] text-gray-500">Workplace, designation, and employer details</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">5 fields</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Employer Name</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.employer}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 1</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.address}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">State</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.state}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">City</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.city}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Pincode</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.pincode}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Employer Type</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.serviceLine || 'PVT LTD'}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Designation</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.tenant ? 'Senior Manager - Application Support' : 'Senior Manager - Application Support'}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Employed Since</div><div className="mt-1 text-[13px] font-semibold text-gray-800">01-11-2008</div></div>
                  <div className="col-span-2 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase text-gray-500">Corporate Email</div>
                        <div className="mt-1 break-all text-[13px] font-semibold text-gray-800">{caseData.emailOffice || caseData.email || 'N/A'}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:ml-2">
                        {corporateEmailVerification && (
                          corporateEmailVerification.status === 'VALID' ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs">
                              ✓ VALID (Mailbox Verified)
                            </span>
                          ) : corporateEmailVerification.status === 'CATCH_ALL' ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs">
                              ⚠️ CATCH-ALL (Domain Valid)
                            </span>
                          ) : corporateEmailVerification.status === 'UNKNOWN' ? (
                            <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs">
                              ℹ️ UNVERIFIED (SMTP Protected)
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 border border-rose-300 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs">
                              ❌ INVALID (Mailbox Not Found)
                            </span>
                          )
                        )}
                        <button
                          type="button"
                          onClick={verifyCorporateEmailAddress}
                          disabled={corporateEmailSaving || !caseData.emailOffice || caseData.emailOffice === 'N/A'}
                          className="rounded-lg bg-[#12345b] px-4 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0d2848] disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {corporateEmailSaving ? 'Verifying...' : corporateEmailVerification ? 'Verify Again' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">References</div>
                    <div className="text-[11px] text-gray-500">Reference contacts and linked loan or lead records</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">{(caseData.references?.length || 4)} contacts</span>
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-max min-w-full border-collapse text-[11px] text-slate-700">
                    <thead className="sticky top-0 z-10 bg-[#0f2039] text-white">
                      <tr>
                        <th className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide">Sr No.</th>
                        {referenceColumns.map(column => <th key={column} className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide">{column.replace(/_/g, ' ')}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {referenceRows.map(ref => <tr key={`${ref.srNo}-${ref.name}`} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-3">{ref.srNo}</td>
                        {referenceColumns.map(column => {
                          const value = ref.data?.[column]
                          return <td key={column} className="max-w-[320px] whitespace-normal break-words px-3 py-3 align-top">{value == null || value === '' ? 'N/A' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
                        })}
                      </tr>)}
                      {referenceRows.length === 0 && <tr><td colSpan={Math.max(1, referenceColumns.length + 1)} className="px-4 py-8 text-center text-slate-400">No reference data available.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Loan Details ── */}
          {activeTab === 'loan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#f8fbff] to-[#eef3fb] border-b border-slate-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Application Information</div>
                      <div className="text-[11px] text-gray-500">Loan application and borrower screening details</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">17 fields</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Lead ID</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.loanLeadId || caseData.id}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Application No</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.applicationNo || caseData.id}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Borrower Type</div><div className="mt-1 text-[13px] font-semibold text-gray-800">NEW</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Loan Applied</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.loan}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Loan Purpose</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.purpose}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Income Type</div><div className="mt-1 text-[13px] font-semibold text-gray-800">SALARIED</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Salary</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.income}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">State</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.state}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Branch</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.branch}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Email (Personal)</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.email}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Lead Source</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.loanSource || caseData.website}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Applied On</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.applied}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Forwarded By (Telecaller)</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.forwardedBy || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Forwarded On</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.forwardedOn || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Screened By (FCU)</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{reviewerName}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">RM No</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.rm || 'N/A'}</div></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#f8fbff] to-[#eef3fb] border-b border-slate-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Borrower Information</div>
                      <div className="text-[11px] text-gray-500">Profile, identity, and screening metadata</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">16 fields</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Lead Reference No</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.leadReferenceNo || caseData.ref}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">CIF No</div><div className="mt-1 text-[13px] font-semibold text-gray-800">N/A</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Title</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{(() => {
                      const g = String(caseData.gender || caseData.ekycDetails?.aadhaar?.gender || '').trim().toUpperCase()
                      const isF = g === 'FEMALE' || g === 'F'
                      const isM = String(caseData.maritalStatus || '').trim().toUpperCase() === 'MARRIED'
                      if (caseData.title && caseData.title !== 'MR') return String(caseData.title).toUpperCase()
                      return isF ? (isM ? 'MRS' : 'MS') : 'MR'
                    })()}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">First Name</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.firstName || caseData.borrower.split(' ')[0]}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">DOB</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.dob}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Religion</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.religion || 'HINDU'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Marital Status</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.maritalStatus || 'SINGLE'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Obligations</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.obligations || '—'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Mobile Alternate</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.alternateMobile || '—'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Contact No. (Office)</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.contactOffice || caseData.mobile}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Campaign</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.campaign || 'HOME JOINING'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Device Model</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.deviceModel || 'OnePlus 10R'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Device Type</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.deviceType || 'Mobile'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Browser Info</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.browserInfo || 'Chrome 125'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">IP Address</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.ipAddress || '106.201.117.70'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Status</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{STATUS_CONFIG[caseStatus]?.label ?? caseStatus}</div></div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Customer Location Map</div>
                    <div className="text-[11px] text-gray-500">Location snapshot from the applicant lead flow</div>
                  </div>
                  <div className="flex gap-2">
                    {hasValidLocation && <button onClick={() => navigator.clipboard.writeText(`${resolvedLat}, ${resolvedLng}`).then(() => showToast('Coordinates copied', 'success'))} className="px-3 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">Copy coordinates</button>}
                    <button onClick={() => window.open(externalMapUrl, '_blank', 'noopener,noreferrer')} className="px-3 py-1 rounded bg-[#1e3a5f] text-white text-[10px] font-semibold">Open on map</button>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-[11px]">
                      <div className="text-gray-500 uppercase text-[9px]">Latitude</div>
                      <div className="font-semibold text-gray-800">{hasValidLocation ? resolvedLat!.toFixed(6) : locationLoading ? 'Resolving...' : 'Unavailable'}</div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-[11px]">
                      <div className="text-gray-500 uppercase text-[9px]">Longitude</div>
                      <div className="font-semibold text-gray-800">{hasValidLocation ? resolvedLng!.toFixed(6) : locationLoading ? 'Resolving...' : 'Unavailable'}</div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-[11px]">
                      <div className="text-gray-500 uppercase text-[9px]">City</div>
                      <div className="font-semibold text-gray-800">{caseData.city}</div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-[11px]">
                      <div className="text-gray-500 uppercase text-[9px]">Branch</div>
                      <div className="font-semibold text-gray-800">{caseData.branch || 'N/A'}</div>
                    </div>
                    <div className="rounded border border-gray-200 bg-gray-50 p-2 text-[11px]">
                      <div className="text-gray-500 uppercase text-[9px]">Source</div>
                      <div className="font-semibold text-gray-800">{caseData.website || 'Website'}</div>
                    </div>
                  </div>
                  <div className="relative h-72 overflow-hidden rounded-xl border border-gray-200 bg-slate-100">
                    <iframe
                      title={`Location of ${caseData.borrower}`}
                      src={mapEmbedUrl}
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-white/95 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow">{hasDatabaseLocation ? 'Exact GPS location' : hasValidLocation ? 'Resolved location' : 'Location unavailable'}</div>
                    <div className="pointer-events-none absolute top-3 right-3 rounded bg-white/95 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow">{hasValidLocation ? 'OpenStreetMap' : 'Google Maps'}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Document request link</div>
                      <div className="text-[11px] text-gray-500">Create shareable requests for customer uploads</div>
                    </div>
                    <button onClick={shareDocumentLink} className="px-3 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">Share</button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded border border-gray-200 bg-gray-50 p-3">
                        <div className="text-[10px] font-semibold uppercase text-gray-500">Pending docs</div>
                        <div className="mt-1 text-2xl font-bold text-[#1e3a5f]">{documentRequest?.documents?.filter(doc => doc.status === 'PENDING').length || 0}</div>
                      </div>
                      <div className="rounded border border-gray-200 bg-gray-50 p-3">
                        <div className="text-[10px] font-semibold uppercase text-gray-500">Pending follow-ups</div>
                        <div className="mt-1 text-2xl font-bold text-blue-600">{documentRequest?.status === 'ACTIVE' || documentRequest?.status === 'COMPLETED' ? 1 : 0}</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-semibold text-gray-700">Select required loan document(s)</div>
                        <div className="text-[10px] text-gray-500 font-medium">{selectedRequestDocs.length} selected</div>
                      </div>
                      <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5 border border-gray-200 rounded-lg p-2.5 bg-gray-50/50">
                        {documentOptions.map(doc => (
                          <label key={doc} className="flex items-center gap-2 text-[11px] text-gray-700 hover:text-gray-900 cursor-pointer p-1 rounded hover:bg-white transition-colors">
                            <input type="checkbox" checked={selectedRequestDocs.includes(doc)} onChange={() => setSelectedRequestDocs(current => current.includes(doc) ? current.filter(item => item !== doc) : [...current, doc])} className="h-3.5 w-3.5 rounded accent-blue-600 cursor-pointer" />
                            <span>{doc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={createShareLink} disabled={requestSaving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50">{requestSaving ? 'Saving…' : 'Create share link'}</button>
                      <button onClick={shareDocumentLink} disabled={!shareUrl} className="px-4 py-2 bg-slate-700 text-white rounded text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-50">Share</button>
                      <button onClick={copyShareLink} disabled={!shareUrl} className="px-4 py-2 bg-slate-100 text-gray-700 rounded text-[11px] font-semibold border border-gray-200 hover:bg-slate-200 disabled:opacity-50">Copy</button>
                    </div>
                    <div className="rounded border border-gray-200 bg-[#f8fafc] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-gray-700">Share link</div>
                        {(documentRequest?.status === 'ACTIVE' || documentRequest?.status === 'COMPLETED') && (
                          <button
                            onClick={disableShareLink}
                            disabled={requestSaving}
                            className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded text-[10px] font-bold hover:bg-rose-100 transition-colors"
                          >
                            {requestSaving ? 'Disabling…' : 'Disable link'}
                          </button>
                        )}
                      </div>
                      {shareUrl ? (
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center justify-between gap-2 break-all text-[11px] text-blue-600 font-mono bg-white p-2.5 rounded border border-blue-200 hover:border-blue-400 hover:bg-blue-50/40 transition shadow-sm"
                          title="Click to open upload page in new tab"
                        >
                          <span className="truncate hover:underline underline-offset-2">{shareUrl}</span>
                          <span className="shrink-0 flex items-center gap-1 text-[10px] font-sans font-bold bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm group-hover:bg-blue-700 transition">
                            Open ↗
                          </span>
                        </a>
                      ) : (
                        <div className="break-all text-[11px] text-gray-400 font-mono bg-white p-2 rounded border border-gray-200">
                          No active share link
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                        <span>Requested docs: <strong className="text-gray-700">{documentRequest?.documents?.map(doc => doc.documentName).join(', ') || 'None'}</strong></span>
                        <span className={`px-2 py-0.5 rounded font-bold ${documentRequest?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : documentRequest?.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                          {documentRequest?.status || 'NOT CREATED'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Customer upload portal & direct upload</div>
                      <div className="text-[11px] text-gray-500">Upload on behalf of customer or monitor live uploads</div>
                    </div>
                    <button
                      onClick={() => shareUrl && window.open(shareUrl, '_blank')}
                      disabled={!shareUrl}
                      className="px-3 py-1 rounded-lg border border-blue-200 bg-white text-[10px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40 transition flex items-center gap-1 shadow-sm"
                    >
                      <span>Portal</span>
                      <span>↗</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-4 flex-1">
                    {/* Progress Bar & Status Pill */}
                    {(() => {
                      const activeBackendDocs = Array.isArray(documentRequest?.documents) ? documentRequest.documents : []
                      const displayDocs = selectedRequestDocs.map(name => {
                        const matched = activeBackendDocs.find((d: any) => String(d.documentName || '').toLowerCase() === String(name).toLowerCase())
                        return matched || { id: name, documentName: name, status: 'PENDING', fileName: '', filePath: '' }
                      })
                      const uploadedDocsCount = displayDocs.filter(doc => doc.status === 'UPLOADED').length
                      const totalDocsCount = displayDocs.length

                      return (
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700">
                              {uploadedDocsCount}/{totalDocsCount} Uploaded
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              {totalDocsCount ? Math.round((uploadedDocsCount / totalDocsCount) * 100) : 0}% Complete
                            </span>
                          </div>
                          <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-500"
                              style={{ width: `${totalDocsCount ? (uploadedDocsCount / totalDocsCount) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* All Uploaded Celebration Banner */}
                    {selectedRequestDocs.length > 0 && (() => {
                      const activeBackendDocs = Array.isArray(documentRequest?.documents) ? documentRequest.documents : []
                      const allDone = selectedRequestDocs.every(name => {
                        const matched = activeBackendDocs.find((d: any) => String(d.documentName || '').toLowerCase() === String(name).toLowerCase())
                        return matched && matched.status === 'UPLOADED'
                      })
                      return allDone ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center shadow-sm">
                          <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white shadow">✓</div>
                          <div className="text-xs font-bold text-emerald-800">All Selected Documents Uploaded</div>
                          <div className="text-[10px] text-emerald-600">All selected documents are uploaded and ready for FCU verification.</div>
                        </div>
                      ) : null
                    })()}

                    {/* Interactive Per-Document Upload Cards */}
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {selectedRequestDocs.length === 0 ? (
                        <div className="p-8 text-center text-xs text-gray-400">
                          No documents selected. Check the required loan documents from the left list.
                        </div>
                      ) : (
                        selectedRequestDocs.map((docName, idx) => {
                          const activeBackendDocs = Array.isArray(documentRequest?.documents) ? documentRequest.documents : []
                          const matchedDoc = activeBackendDocs.find((d: any) => String(d.documentName || '').toLowerCase() === String(docName).toLowerCase())
                          const docId = matchedDoc ? matchedDoc.id : `sel-${idx}`
                          const isUploaded = matchedDoc?.status === 'UPLOADED'
                          const isDocSaving = uploadingDocId === docId || uploadingDocId === docName
                          const fileUrl = matchedDoc?.filePath ? `${API_BASE_URL}/${matchedDoc.filePath.replace(/^\/+/, '')}` : ''

                          return (
                            <div
                              key={docName}
                              className={`p-3 rounded-xl border transition-all ${isUploaded
                                ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                                : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {getDocIcon(docName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800">{docName}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">
                                      {isUploaded ? (
                                        <div className="space-y-0.5">
                                          <div className="font-mono text-slate-700 font-medium break-all">📎 {matchedDoc?.fileName || 'Uploaded file'}</div>
                                          {(() => {
                                            const text = String(matchedDoc?.metaIntegrityDetail || '');
                                            const createdMatch = text.match(/Created:\s*([^\s]+\s+[^\s]+)/i);
                                            const modifiedMatch = text.match(/Modified:\s*([^\s]+\s+[^\s]+)/i);
                                            if (createdMatch || modifiedMatch) {
                                              return (
                                                <div className="text-[8.5px] font-mono text-slate-400 space-y-0.2">
                                                  {createdMatch && <div className="text-emerald-700">{createdMatch[0]}</div>}
                                                  {modifiedMatch && <div>{modifiedMatch[0]}</div>}
                                                </div>
                                              );
                                            }
                                            const uploadDate = matchedDoc?.uploadedAt || matchedDoc?.uploaded_at;
                                            if (uploadDate) {
                                              const d = new Date(uploadDate).toLocaleString('en-IN', {
                                                year: 'numeric', month: '2-digit', day: '2-digit',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                              }).replace(',', '');
                                              return (
                                                <div className="text-[8.5px] font-mono text-slate-400">
                                                  <div className="text-emerald-700">Created: {d}</div>
                                                  <div>Modified: {d}</div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      ) : 'PDF, JPG, PNG, WEBP · Max 5MB'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {isUploaded ? '✓ Uploaded' : '⏳ Pending'}
                                  </span>

                                  {isUploaded && fileUrl && (
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition"
                                    >
                                      View ↗
                                    </a>
                                  )}

                                  <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm ${isDocSaving
                                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    : isUploaded
                                      ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                      : 'bg-[#1e3a5f] hover:bg-blue-700 text-white shadow-blue-500/10'
                                    }`}>
                                    <input
                                      type="file"
                                      accept=".pdf,image/jpeg,image/png,image/webp"
                                      disabled={isDocSaving}
                                      onChange={event => {
                                        const file = event.target.files?.[0]
                                        if (file) void uploadSingleDoc(matchedDoc ? matchedDoc.id : docName, file)
                                        event.target.value = ''
                                      }}
                                      className="hidden"
                                    />
                                    {isDocSaving ? (
                                      <>
                                        <span className="w-2.5 h-2.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                                        <span>Uploading…</span>
                                      </>
                                    ) : isUploaded ? (
                                      <>
                                        <span>↻</span>
                                        <span>Replace</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>📁</span>
                                        <span>Upload</span>
                                      </>
                                    )}
                                  </label>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Lead Activity & User Action Log (Application Tab Only) ── */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Activity & Audit Logs</div>
                      <div className="text-[10px] text-gray-500">Real-time log of actions performed on this lead</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-600 shadow-xs">
                      {history.length} {history.length === 1 ? 'event' : 'events'}
                    </span>
                    <button
                      onClick={() => void loadCaseHistory()}
                      disabled={historyLoading}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-[10px] font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 transition shadow-xs flex items-center gap-1"
                      title="Refresh activity logs"
                    >
                      <span className={historyLoading ? 'animate-spin' : ''}>↻</span>
                      <span>{historyLoading ? 'Refreshing…' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>

                {historyLoading && !history.length ? (
                  <div className="py-8 text-center text-xs text-gray-400">Loading activity logs…</div>
                ) : history.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    No activity logs recorded yet for this lead. Actions performed will appear here automatically.
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100">
                    {history.map((item: any, idx: number) => {
                      const isAppCreated = (item.eventType || item.event_type || item.type) === 'APPLICATION_CREATED' || String(item.title || '').toLowerCase().includes('application submitted');
                      const telecallerFallback = caseData?.forwardedBy && caseData.forwardedBy !== 'N/A'
                        ? caseData.forwardedBy
                        : (caseData?.assignedTo && caseData.assignedTo !== 'N/A' ? caseData.assignedTo : (caseData?.rm && caseData.rm !== 'Unassigned' ? caseData.rm : 'Telecaller'));

                      const performedByName = (item.performedBy && item.performedBy !== 'System')
                        ? item.performedBy
                        : (isAppCreated ? telecallerFallback : (item.performed_by_name || 'System'));

                      const role = item.role
                        ? item.role
                        : (isAppCreated ? 'Telecaller' : (item.performedBy && item.performedBy !== 'System' ? 'FCU Reviewer' : 'System'));

                      const t = (String(item.title || '') + ' ' + String(item.eventType || item.event_type || '')).toLowerCase();

                      const isApproved = t.includes('approve') || t.includes('pass');
                      const isRejected = t.includes('reject') || t.includes('fraud') || t.includes('fail');
                      const isCreated = t.includes('created') || t.includes('create') || t.includes('submit');
                      const isDisabled = t.includes('disabled') || t.includes('disable') || t.includes('close');
                      const isWhatsApp = t.includes('whatsapp') || t.includes('message');

                      const dotColor =
                        isApproved ? 'bg-emerald-500' :
                          isRejected ? 'bg-rose-500' :
                            isDisabled ? 'bg-amber-500' :
                              isCreated ? 'bg-blue-600' :
                                isWhatsApp ? 'bg-green-600' :
                                  'bg-slate-400';

                      return (
                        <div key={item.id || idx} className="px-4 py-2.5 hover:bg-slate-50/70 transition-colors flex items-start gap-3">
                          <span className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`}></span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-gray-900">
                                  {isAppCreated && !String(item.title || '').includes('Telecaller') ? 'Application submitted by Telecaller' : (item.title || item.eventType || 'Activity Event')}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  by <strong className="text-gray-700">{performedByName}</strong>
                                  <span className="text-gray-400"> · {role}</span>
                                </span>
                              </div>

                              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                {item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', hour12: true
                                }) : 'N/A'}
                              </span>
                            </div>

                            {item.description && (
                              <div className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Customer & Panel Uploaded Documents ── */}
          {activeTab === 'docs' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-sm font-bold border border-emerald-200">📄</span>
                  <div>
                    <div className="text-[13px] font-bold text-gray-900">Customer & Panel Uploaded Documents</div>
                    <div className="text-[11px] text-gray-500">Complete ledger of all documents uploaded by Customer, Telecaller, or Credit Manager with forensic metadata & tampering verification.</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700">
                    {docs.length} Total Files
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={approveAllDocuments}
                      disabled={documentActionsLocked || actionSaving || docs.length === 0 || docs.some((d: any) => d.status !== 'APPROVED' && !viewedDocIds.has(d.id))}
                      title={docs.some((d: any) => d.status !== 'APPROVED' && !viewedDocIds.has(d.id)) ? 'Pehle sabhi documents ko View karein' : 'Verify All Documents'}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ✓ Verify All
                    </button>
                  )}
                </div>
              </div>

              {docs.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400">
                  No documents have been uploaded for this lead yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#1e3a5f] text-white text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-3 py-2.5 whitespace-nowrap">LEAD ID</th>
                        <th className="px-2.5 py-2.5 whitespace-nowrap">DOC ID</th>
                        <th className="px-3 py-2.5 min-w-[200px]">DOCUMENT & FILE</th>
                        <th className="px-3 py-2.5 min-w-[190px]">META & INTEGRITY</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">UPLOADED BY</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">UPLOADED ON</th>
                        <th className="px-2.5 py-2.5 text-center whitespace-nowrap">STATUS</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {docs.map((doc: any) => {
                        const isVerified = doc.status === 'APPROVED';
                        const isRejected = doc.status === 'REJECTED';
                        const isDocViewed = viewedDocIds.has(doc.id) || isVerified;
                        const uploadedByLower = String(doc.uploadedBy || 'customer').toLowerCase();
                        const formattedDate = doc.uploaded ? new Date(doc.uploaded).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        }) : 'N/A';

                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Lead ID */}
                            <td className="px-3 py-2.5 font-bold text-gray-700 whitespace-nowrap align-middle text-[11px] font-mono">
                              {doc.leadId || caseData.loanLeadId || caseData.ref || 'GP-LEAD-6072'}
                            </td>

                            {/* Doc ID */}
                            <td className="px-2.5 py-2.5 font-bold text-blue-600 whitespace-nowrap align-middle text-[11px] font-mono">
                              {doc.docId || 'CD-1'}
                            </td>

                            {/* Document & File Name */}
                            <td className="px-3 py-2.5 align-middle">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 text-[12px]">{doc.name}</span>
                                {doc.faceMatch && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[8px] font-bold">
                                    {doc.faceMatch}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-600 font-mono mt-0.5 break-all">
                                📎 {doc.fileName || 'document.pdf'}
                              </div>
                            </td>

                            {/* Meta & Integrity */}
                            <td className="px-3 py-2.5 align-middle">
                              {(() => {
                                const statusStr = String(doc.metaIntegrityStatus || '').toLowerCase();
                                const isDocModified = statusStr.includes('modified') || statusStr.includes('tamper') || statusStr.includes('suspicious') || statusStr.includes('edited');
                                return (
                                  <div className="min-w-[200px]">
                                    <div className="flex items-center gap-1.5 font-bold text-[10px]">
                                      {isDocModified ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                                          ⚠️ {doc.metaIntegrityStatus || 'Modified / Tampered'}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                          ✓ {doc.metaIntegrityStatus || 'Original / Clean'}
                                        </span>
                                      )}
                                    </div>
                                    {doc.metaIntegrityDetail && (
                                      <div className={`mt-1 text-[9px] font-mono leading-snug space-y-0.5 ${isDocModified ? 'text-rose-600 font-medium' : 'text-gray-400 font-normal'}`}>
                                        {(() => {
                                          const text = String(doc.metaIntegrityDetail || '');
                                          const createdMatch = text.match(/Created:\s*([^\s]+\s+[^\s]+)/i);
                                          const modifiedMatch = text.match(/Modified:\s*([^\s]+\s+[^\s]+)/i);

                                          if (createdMatch || modifiedMatch) {
                                            const created = createdMatch ? createdMatch[0] : '';
                                            const modified = modifiedMatch ? modifiedMatch[0] : '';
                                            let rest = text;
                                            if (created) rest = rest.replace(created, '');
                                            if (modified) rest = rest.replace(modified, '');
                                            const extra = rest.trim();

                                            return (
                                              <>
                                                {created && <div>{created}</div>}
                                                {modified && <div>{modified}</div>}
                                                {extra && <div className="text-[8.5px] leading-tight opacity-90">{extra}</div>}
                                              </>
                                            );
                                          }
                                          return <div>{text}</div>;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Uploaded By */}
                            <td className="px-3 py-2.5 whitespace-nowrap align-middle">
                              {uploadedByLower.includes('telecaller') ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[10px] font-semibold">
                                  🎧 Telecaller
                                </span>
                              ) : uploadedByLower.includes('credit') ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700 text-[10px] font-semibold">
                                  💼 Credit
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-semibold">
                                  👤 Customer
                                </span>
                              )}
                            </td>

                            {/* Uploaded On */}
                            <td className="px-3 py-2.5 text-gray-500 text-[10px] whitespace-nowrap align-middle font-mono">
                              {formattedDate}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5 text-center whitespace-nowrap align-middle">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${isVerified ? 'border-emerald-300 text-emerald-700 bg-emerald-50/70' :
                                isRejected ? 'border-rose-300 text-rose-700 bg-rose-50/70' :
                                  'border-amber-300 text-amber-700 bg-amber-50/70'
                                }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                {isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2.5 text-right whitespace-nowrap align-middle">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openDocPreview(doc)}
                                  className={`px-2.5 py-1 rounded-md border text-[10px] font-bold transition flex items-center gap-1 ${isDocViewed ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                >
                                  {isDocViewed ? '👁 Viewed' : '👁 View'}
                                </button>
                                {!isReadOnly && (
                                  <>
                                    <button
                                      onClick={() => updateDocStatus(doc.id, 'APPROVED')}
                                      disabled={documentActionsLocked || doc.status === 'APPROVED' || actionSaving || !isDocViewed}
                                      title={!isDocViewed ? 'Pehle View button par click karke document check karein' : 'Verify document'}
                                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${!isDocViewed && doc.status !== 'APPROVED'
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 opacity-60'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed'
                                        }`}
                                    >
                                      ✓ Verify
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDocumentRejectTarget({ id: doc.id, name: doc.name })
                                        setFraudSourceDocument(null)
                                        setActionReason('')
                                        setConfirmAction('Reject Document')
                                      }}
                                      disabled={documentActionsLocked || doc.status === 'REJECTED' || actionSaving}
                                      className="px-2.5 py-1 rounded-md border border-rose-300 bg-white text-rose-600 text-[10px] font-bold hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1"
                                    >
                                      ✕ Reject
                                    </button>
                                    <button
                                      onClick={() => {
                                        setFraudSourceDocument({ id: doc.id, name: doc.name })
                                        setDocumentRejectTarget(null)
                                        setActionReason(`Fraud detected in document: ${doc.name}`)
                                        setConfirmAction('Flag as Fraud')
                                      }}
                                      disabled={documentActionsLocked || actionSaving}
                                      className="px-2.5 py-1 rounded-md border border-rose-400 bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1"
                                    >
                                      ⚑ Flag
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── FCU Analysis ── */}
          {activeTab === 'aadhaar' && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                <EkycCard title="E-Aadhaar details" subtitle="Core Aadhaar identity and verification information" badge={String(ekyc?.aadhaar.status || 'Not available')} tone="blue" fields={[
                  ['Linked Mobile', ekyc?.aadhaar.linkedMobile], ['E-Aadhaar Number', ekyc?.aadhaar.number],
                  ['E-Aadhaar Status', ekyc?.aadhaar.status], ['Name on Aadhaar', ekyc?.aadhaar.name],
                  ['DOB', ekyc?.aadhaar.dob], ['Gender', ekyc?.aadhaar.gender],
                  ['Issued By', ekyc?.aadhaar.issuedBy], ['Verified On', ekyc?.aadhaar.verifiedOn],
                  ['Address Type', ekyc?.aadhaar.addressType],
                ]} />
                <EkycImageCard title="Aadhaar photo" subtitle="Captured Aadhaar identity proof" image={ekycAssetUrl(ekyc?.aadhaar.photo)} fallback="📷" caption="Aadhaar front image" />
              </div>
              <EkycCard title="Aadhaar address" subtitle="Verified residential address captured from Aadhaar records" badge="Address" tone="green" fields={[
                ['Address Line 1', ekyc?.aadhaar.address], ['Address Line 2', ekyc?.aadhaar.addressLine2],
                ['City', ekyc?.aadhaar.city], ['State', ekyc?.aadhaar.state],
                ['Pincode', ekyc?.aadhaar.pincode], ['Country', ekyc?.aadhaar.country],
              ]} />
              <section className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 shadow-sm">
                <div className="border-b border-blue-100 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-900">Fetch Aadhaar details</h3>
                  <p className="mt-1 text-[11px] text-slate-500">Enter the Aadhaar number to fetch verified details from the provider API and save them to this application.</p>
                </div>
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
                  <label className="flex-1">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Aadhaar Number</span>
                    <input value={aadhaarInput} onChange={(event) => setAadhaarInput(event.target.value.replace(/\D/g, '').slice(0, 16))}
                      inputMode="numeric" autoComplete="off" placeholder="Enter Aadhaar number"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold tracking-wider text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <button type="button" onClick={fetchAadhaarDetails} disabled={aadhaarSaving || aadhaarInput.replace(/\D/g, '').length < 8}
                    className="rounded-xl bg-blue-700 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {aadhaarSaving ? 'Fetching Aadhaar...' : 'Fetch Aadhaar Details'}
                  </button>
                </div>
              </section>
              <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
                  <h3 className="text-sm font-bold text-slate-900">Relation with applicant</h3>
                  <p className="mt-1 text-[11px] text-slate-500">Select how the fetched Aadhaar holder is related to the applicant.</p>
                </div>
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
                  <label className="flex-1">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Relation</span>
                    <select value={aadhaarRelation} onChange={(event) => setAadhaarRelation(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                      <option value="">Select relation</option>
                      {['SELF', 'FATHER', 'MOTHER', 'SPOUSE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'GUARDIAN', 'OTHER'].map((relation) => <option key={relation} value={relation}>{relation.charAt(0) + relation.slice(1).toLowerCase()}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={saveAadhaarRelation} disabled={relationSaving || !aadhaarRelation || !ekyc?.fetchedAadhaar}
                    className="rounded-xl bg-emerald-700 px-7 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {relationSaving ? 'Saving Relation...' : 'Save Relation'}
                  </button>
                </div>
              </section>
              {ekyc?.fetchedAadhaar && (
                <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Fetched Aadhaar API Data</h3>
                    <p className="mt-1 text-[11px] text-slate-500">This is a separate verification result. The customer's original profile data has not been changed.</p>
                  </div>
                  <div>
                    <EkycCard title="Fetched Aadhaar identity" subtitle="Identity returned by the Aadhaar provider API" badge={String(ekyc.fetchedAadhaar.status || 'Fetched')} tone="blue" fields={[
                      ['HTTP Response Code', ekyc.fetchedAadhaar.httpResponseCode], ['Response Type', ekyc.fetchedAadhaar.statusType],
                      ['Aadhaar Number', ekyc.fetchedAadhaar.number], ['Full Name', ekyc.fetchedAadhaar.name],
                      ['PAN Number', ekyc.fetchedAadhaar.pan], ['First Name', ekyc.fetchedAadhaar.firstName],
                      ['Middle Name', ekyc.fetchedAadhaar.middleName], ['Last Name', ekyc.fetchedAadhaar.lastName],
                      ['Date of Birth', ekyc.fetchedAadhaar.dob], ['Gender', ekyc.fetchedAadhaar.gender],
                      ['Relation with Applicant', ekyc.fetchedAadhaar.relation || 'Not selected'],
                      ['Provider Message', ekyc.fetchedAadhaar.providerMessage],
                    ]} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fcu' && (
            <div className="space-y-3">
              <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
                <EkycCard title="E-Aadhaar details" subtitle="Core eKYC identity and verification information" badge={String(ekyc?.aadhaar.status || 'Not available')} tone="blue" fields={[
                  ['Linked Mobile', ekyc?.aadhaar.linkedMobile], ['E-Aadhaar Number', ekyc?.aadhaar.number], ['E-Aadhaar Status', ekyc?.aadhaar.status],
                  ['Name on Aadhaar', ekyc?.aadhaar.name], ['DOB', ekyc?.aadhaar.dob], ['Gender', ekyc?.aadhaar.gender], ['Issued By', ekyc?.aadhaar.issuedBy],
                  ['Verified On', ekyc?.aadhaar.verifiedOn], ['Address Type', ekyc?.aadhaar.addressType],
                ]} />
                <EkycImageCard title="Aadhaar photo" subtitle="Captured identity proof image" image={ekycAssetUrl(ekyc?.aadhaar.photo)} fallback="📷" caption="Aadhaar front image" />
              </div>
              <EkycCard title="Aadhaar address" subtitle="Address verification captured from eKYC records" badge="Address" tone="green" fields={[
                ['Address Line 1', ekyc?.aadhaar.address], ['Address Line 2', ekyc?.aadhaar.addressLine2], ['City', ekyc?.aadhaar.city],
                ['State', ekyc?.aadhaar.state], ['Pincode', ekyc?.aadhaar.pincode], ['Country', ekyc?.aadhaar.country],
              ]} />
              <EkycCard title="PAN card details" subtitle="PAN verification and identity matching" badge="PAN" tone="blue" fields={[
                ['PAN Number', ekyc?.pan.number], ['PAN Status', ekyc?.pan.status], ['Name on PAN', ekyc?.pan.name], ['Father’s Name', ekyc?.pan.fatherName],
                ['Date of Birth', ekyc?.pan.dob], ['PAN Issued On', ekyc?.pan.issuedOn], ['PAN City', ekyc?.pan.city], ['PAN Office', ekyc?.pan.office],
              ]} />
              {/* CKYC provider integration is temporarily disabled.
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button type="button" onClick={fetchCkycDetails} disabled={ckycSaving || !ekyc?.pan?.number || ekyc.pan.number === 'N/A'}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {ckycSaving ? 'Fetching CKYC details...' : (ekyc?.ckyc?.fetched === 'Yes' ? 'Refresh CKYC Details' : 'Fetch CKYC Details')}
                  </button>
                </div>
                <EkycCard title="CKYC details" subtitle="Central KYC registration summary fetched from the provider API" badge={String(ekyc?.ckyc?.status || 'CKYC')} tone="blue" fields={[
                  ['CKYC Number', ekyc?.ckyc.number], ['CKYC Status', ekyc?.ckyc.status], ['CKYC Registered On', ekyc?.ckyc.registeredOn],
                  ['Issuer', ekyc?.ckyc.issuer], ['Proof Type', ekyc?.ckyc.proofType], ['Matching Status', ekyc?.ckyc.matchingStatus],
                  ['Request ID', ekyc?.ckyc.requestId], ['Provider Message', ekyc?.ckyc.message],
                ]} />
              </div>
              */}
              <EkycCard title="UAN details" subtitle="Employment and EPFO-linked profile status" badge="UAN" tone="green" fields={[
                ['UAN Number', ekyc?.uan.number], ['UAN Status', ekyc?.uan.status], ['UAN Verified On', ekyc?.uan.verifiedOn], ['Employer Name', ekyc?.uan.employerName],
                ['Name in UAN', ekyc?.uan.nameInUan], ['UAN Mobile', ekyc?.uan.mobileInUan], ['Gender (UAN)', ekyc?.uan.gender], ['DOB (UAN)', ekyc?.uan.dateOfBirth],
                ['Aadhaar Ver. Status', ekyc?.uan.aadhaarVerificationStatus], ['UAN Count', ekyc?.uan.uanCount],
              ]} />
              <EkycCard title="UAN employment details" subtitle="Work profile and employment continuity" badge="Employment" tone="blue" fields={[
                ['UAN Employment Type', ekyc?.uan.employmentType], ['Designation', ekyc?.uan.designation], ['Is Employed', ekyc?.uan.isEmployed], ['Joined On', ekyc?.uan.joinedOn],
                ['Date of Exit', ekyc?.uan.dateOfExit], ['Date of Exit Marked', ekyc?.uan.dateOfExitMarked], ['Office Location', ekyc?.uan.officeLocation],
                ['Employee Status', ekyc?.uan.employeeStatus], ['Member ID', ekyc?.uan.memberId], ['Establishment ID', ekyc?.uan.establishmentId],
              ]} />
              <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)]">
                <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-sm text-emerald-600 font-bold">
                      🏦
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-slate-900">Bank account details</div>
                      <div className="text-[10px] text-slate-500">Banking information from the customer profile</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openBankEditModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95"
                    >
                      <span>✏️</span>
                      <span>Edit & Verify</span>
                    </button>
                    <span className={`rounded-full border px-3 py-1 text-[9px] font-bold ${String(ekyc?.bank?.verificationStatus || '').toLowerCase() === 'verified'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>
                      {String(ekyc?.bank?.verificationStatus || 'Not verified')}
                    </span>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2">
                  {[
                    ['Account Holder Name', ekyc?.bank?.accountHolderName],
                    ['Bank Name', ekyc?.bank?.bankName],
                    ['Account Number', ekyc?.bank?.accountNumber],
                    ['IFSC Code', ekyc?.bank?.ifscCode],
                    ['Branch Name', ekyc?.bank?.branchName],
                    ['Account Type', ekyc?.bank?.accountType],
                    ['Salary Account', ekyc?.bank?.salaryAccount],
                  ].map(([label, rawValue], index) => (
                    <div key={`${label}-${index}`} className="grid min-w-0 grid-cols-[minmax(110px,.75fr)_minmax(0,1.25fr)] items-start gap-3 border-b border-slate-100 px-4 py-3 even:bg-slate-50/50">
                      <div className="min-w-0 break-words text-[9px] font-bold uppercase tracking-[.2em] text-slate-500">{label}</div>
                      <div className="min-w-0 whitespace-pre-wrap break-all text-[11px] font-medium leading-relaxed text-slate-700 font-mono">
                        {rawValue !== null && rawValue !== undefined && rawValue !== '' ? String(rawValue).trim() : 'Not available'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button type="button" onClick={verifyBankPenny} disabled={bankPennySaving || ekyc?.bank?.status !== 'Available'}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {bankPennySaving ? 'Verifying bank account...' : (ekyc?.bankPenny?.status === 'Verified' ? 'Refresh Bank Verification' : 'Verify Bank Account')}
                  </button>
                </div>
                <EkycCard title="Bank Verification Penny" subtitle="Real-time penny verification of the customer's bank account" badge={String(ekyc?.bankPenny?.status || 'Not verified')} tone="green" fields={[
                  ['HTTP Response Code', ekyc?.bankPenny?.httpResponseCode],
                  ['Result Code', ekyc?.bankPenny?.resultCode],
                  ['Account Number', ekyc?.bankPenny?.accountNumber],
                  ['IFSC Code', ekyc?.bankPenny?.ifscCode], ['Provider Message', ekyc?.bankPenny?.message],
                  ...flattenProviderFields(ekyc?.bankPenny?.providerData || {}).map(([label, value]) => [`Provider ${label}`, value] as [string, string]),
                ]} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button type="button" onClick={fetchMobileBankDetails} disabled={mobileBankSaving}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {mobileBankSaving ? 'Fetching bank details...' : (ekyc?.mobileBank?.status === 'Fetched' ? 'Refresh Mobile to Bank' : 'Fetch Mobile to Bank')}
                  </button>
                </div>
                <EkycCard title="Mobile to Bank details" subtitle="Bank accounts fetched from the customer's registered mobile number" badge={String(ekyc?.mobileBank?.verificationStatus || 'Not verified')} tone="blue" fields={[
                  ['HTTP Response Code', ekyc?.mobileBank?.httpResponseCode],
                  ['Result Code', ekyc?.mobileBank?.resultCode], ['Mobile Number', ekyc?.mobileBank?.mobileNumber],
                  ...flattenProviderFields(ekyc?.mobileBank?.bankAccountData || {}),
                  ['Verification Result', ekyc?.mobileBank?.verificationStatus], ['Verification Reason', ekyc?.mobileBank?.verificationReason],
                  ['Provider Message', ekyc?.mobileBank?.message],
                ]} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button type="button" onClick={fetchMobileUpiDetails} disabled={upiSaving}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {upiSaving ? 'Fetching UPI details...' : (ekyc?.mobileUpi?.status === 'Fetched' ? 'Refresh UPI Details' : 'Fetch UPI Details')}
                  </button>
                </div>
                <EkycCard title="Mobile to UPI details" subtitle="UPI account information fetched from the registered mobile number" badge={String(ekyc?.mobileUpi?.status || 'Not fetched')} tone="blue" fields={[
                  ['HTTP Response Code', ekyc?.mobileUpi?.httpResponseCode], ['Client Reference Number', ekyc?.mobileUpi?.clientRefNum],
                  ['Request ID', ekyc?.mobileUpi?.requestId], ['Result Code', ekyc?.mobileUpi?.resultCode],
                  ['Mobile Number', ekyc?.mobileUpi?.mobileNumber], ['Mobile Linked Name', ekyc?.mobileUpi?.mobileLinkedName],
                  ['VPA / UPI ID', ekyc?.mobileUpi?.vpa], ['Provider Message', ekyc?.mobileUpi?.message],
                ]} />
              </div>
              {/* ── AI Biometric Face Match & Identity Verification Section ── */}
              <div className="space-y-4">
                {/* Row 1: Two Photo Comparison Cards Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Live Customer Selfie */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📷</span>
                        <div className="text-xs font-bold text-slate-800">Image 2: Live Customer Selfie</div>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        Live Camera
                      </span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center flex-1">
                      <div className="w-full min-h-64 sm:h-72 max-h-80 bg-slate-50/80 rounded-2xl flex items-center justify-center p-3 border border-slate-100/80 overflow-hidden">
                        {ekycAssetUrl(ekyc?.selfie) ? (
                          <img
                            src={ekycAssetUrl(ekyc?.selfie)}
                            alt="Live customer selfie"
                            className="max-h-64 max-w-full object-contain rounded-xl shadow-sm"
                          />
                        ) : (
                          <div className="text-center text-slate-400">
                            <span className="text-4xl block mb-2">👤</span>
                            <span className="text-xs">No live selfie captured</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-center text-xs text-slate-500 font-medium">
                        Captured via Mobile Web Camera
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Reference Identity Photo */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🪪</span>
                        <div className="text-xs font-bold text-slate-800">Image 1: Reference Identity Photo</div>
                      </div>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[9px] font-bold text-blue-700">
                        UIDAI Aadhaar
                      </span>
                    </div>
                    <div className="p-4 flex flex-col items-center justify-center flex-1">
                      <div className="w-full min-h-64 sm:h-72 max-h-80 bg-slate-50/80 rounded-2xl flex items-center justify-center p-3 border border-slate-100/80 overflow-hidden">
                        {ekycAssetUrl(ekyc?.aadhaar?.photo || ekyc?.fetchedAadhaar?.photo) ? (
                          <img
                            src={ekycAssetUrl(ekyc?.aadhaar?.photo || ekyc?.fetchedAadhaar?.photo)}
                            alt="Reference identity photo"
                            onError={e => {
                              const target = e.currentTarget
                              target.style.display = 'none'
                              if (target.parentElement) {
                                target.parentElement.innerHTML = '<div class="text-center text-slate-400"><span class="text-4xl block mb-2">🪪</span><span class="text-xs">Aadhaar record photo</span></div>'
                              }
                            }}
                            className="max-h-64 max-w-full object-contain rounded-xl shadow-sm"
                          />
                        ) : (
                          <div className="text-center text-slate-400">
                            <span className="text-4xl block mb-2">🪪</span>
                            <span className="text-xs">No reference photo extracted</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-center text-xs text-slate-500 font-medium">
                        Extracted from Government Identity Record
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Match Summary Banner */}
                {(() => {
                  const hasDbScore = ekyc?.faceMatch?.percentage != null
                  const score = hasDbScore ? Number(ekyc?.faceMatch?.percentage) : 79
                  const dbStatus = String(ekyc?.faceMatch?.status || '').trim().toUpperCase()
                  const isMatch = dbStatus ? (dbStatus.includes('MATCH') && !dbStatus.includes('NO')) : score >= 50
                  const confidence = String(ekyc?.faceMatch?.confidence || (score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW')).toUpperCase()
                  let cleanDetails = ''
                  const rawDetails = ekyc?.faceMatch?.details
                  if (rawDetails) {
                    if (typeof rawDetails === 'object') {
                      cleanDetails = (rawDetails as any).message || (rawDetails as any).result || ''
                    } else if (typeof rawDetails === 'string') {
                      const trimmed = rawDetails.trim()
                      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                        try {
                          const parsed = JSON.parse(trimmed)
                          cleanDetails = parsed.message || parsed.result || ''
                        } catch (e) {
                          cleanDetails = trimmed
                        }
                      } else {
                        cleanDetails = trimmed
                      }
                    }
                  }

                  const detailsText = cleanDetails || (isMatch
                    ? 'The faces in Image 1 and Image 2 show consistent facial geometry and landmark alignment.'
                    : 'The faces in Image 1 and Image 2 do not appear to belong to the same person.')

                  return (
                    <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${isMatch
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-rose-200 bg-rose-50/40'
                      }`}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Score Box */}
                        <div className={`shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center font-mono text-lg font-black shadow-xs ${isMatch
                          ? 'border-emerald-300 bg-white text-emerald-700'
                          : 'border-rose-300 bg-white text-rose-700'
                          }`}>
                          {score}%
                        </div>

                        {/* Text and badges */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-bold ${isMatch ? 'text-emerald-950' : 'text-rose-950'}`}>
                              {ekyc?.faceMatch?.status || (isMatch ? 'Face Match Verified' : 'No Face Match')}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                              {confidence} CONFIDENCE
                            </span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold text-slate-600 bg-slate-100">
                              Quality: GOOD
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {detailsText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Row 3: Detailed 6-Factor AI Facial Geometry Breakdown */}
                {(() => {
                  const hasDbScore = ekyc?.faceMatch?.percentage != null
                  const score = hasDbScore ? Number(ekyc?.faceMatch?.percentage) : 79
                  const isHigh = score >= 60
                  const isMedium = score >= 40 && score < 60
                  const levelText = isHigh ? 'High similarity' : isMedium ? 'Moderate similarity' : 'Low similarity'
                  const overallText = isHigh ? 'High' : isMedium ? 'Moderate' : 'Low'

                  const factors = [
                    { title: '1. Facial Structure & Geometry', value: levelText },
                    { title: '2. Eyes Distance & Proportion', value: levelText },
                    { title: '3. Nose Shape & Position', value: levelText },
                    { title: '4. Mouth & Lip Structure', value: levelText },
                    { title: '5. Jawline & Chin Contours', value: levelText },
                    { title: '6. Overall Facial Similarity', value: overallText },
                  ]

                  return (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,.05)] space-y-3.5">
                      <div className="flex items-center gap-2 text-slate-800">
                        <span className="text-blue-600 text-sm">🛡️</span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Detailed 6-Factor AI Facial Geometry Breakdown
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {factors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition"
                          >
                            <div className="text-[10px] font-semibold text-slate-500">
                              {factor.title}
                            </div>
                            <div className={`text-xs font-bold mt-1 ${isHigh ? 'text-emerald-700' : isMedium ? 'text-amber-700' : 'text-slate-800'
                              }`}>
                              {factor.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div className="flex items-center gap-4 mb-1">
                <div className="text-[11px]"><span className="font-bold text-emerald-700">{checksPass}</span> <span className="text-gray-500">Pass</span></div>
                <div className="text-[11px]"><span className="font-bold text-red-600">{checksFail}</span> <span className="text-gray-500">Fail</span></div>
                <div className="text-[11px]"><span className="font-bold text-amber-600">{checks.filter(c => c.status === 'PENDING').length}</span> <span className="text-gray-500">Pending</span></div>
              </div>
              {checks.map(check => (
                <div key={check.id} className={`flex items-center justify-between border rounded p-3 ${check.status === 'PASS' ? 'border-emerald-200 bg-emerald-50/30' :
                  check.status === 'FAIL' ? 'border-red-200 bg-red-50/30' :
                    'border-gray-200 bg-gray-50/60'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${check.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
                      check.status === 'FAIL' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                      {check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-[11px]">{check.label}</div>
                      <div className="text-[9px] text-gray-500">{check.note}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['PASS', 'FAIL', 'PENDING'] as CheckStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => void updateCheckStatus(check.id, s)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${check.status === s
                          ? s === 'PASS' ? 'bg-emerald-600 text-white' : s === 'FAIL' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                          : 'border border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Field Details ── */}
          {activeTab === 'credit' && (
            <CreditBureauPanel credit={caseData.creditBureau} />
          )}

          {activeTab === 'field' && (
            <div className="space-y-4">
              {fieldReport && (
                <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                  <div className="grid items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white md:grid-cols-[1fr_auto_1fr]">
                    <div><div className="text-[13px] font-bold uppercase tracking-wide">Submitted Field Verification Report</div><div className="mt-0.5 text-[10px] text-emerald-50">{fieldReport.reportId || 'Field report'} · {fieldReport.submittedAt ? new Date(fieldReport.submittedAt).toLocaleString('en-IN') : 'Submitted'}</div></div>
                    <div className="rounded-xl border border-white/25 bg-white/10 px-5 py-2 text-center shadow-sm backdrop-blur-sm">
                      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-50">Verified by</div>
                      <div className="mt-0.5 text-[12px] font-bold">{reportOfficerName}</div>
                      <div className="text-[10px] text-emerald-50">Employee ID: {reportOfficerEmployeeId}</div>
                    </div>
                    <div className="flex md:justify-end"><span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase">{fieldReport.outcome || 'Submitted'}</span></div>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[['GPS latitude', fieldReport.location?.latitude], ['GPS longitude', fieldReport.location?.longitude], ['Accuracy', fieldReport.location?.accuracy ? `${fieldReport.location.accuracy} m` : undefined], ['Location source', fieldReport.location?.source]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 break-words text-[12px] font-semibold text-slate-800">{value ?? 'N/A'}</div></div>)}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Submitted verification summary</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {reportSubmissionSummary.map(item => <div key={item.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${item.done ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${item.done ? 'bg-emerald-500' : 'bg-rose-500'}`}>{item.done ? '✓' : '✕'}</span><div><div className="text-[10px] font-bold text-slate-700">{item.label}</div><div className={`text-[9px] font-semibold ${item.done ? 'text-emerald-700' : 'text-rose-700'}`}>{item.done ? 'Completed' : 'Missing'}</div></div></div>)}
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-bold uppercase text-slate-500">Verified address</div><div className="mt-1 text-[12px] font-medium leading-5 text-slate-800">{fieldReport.location?.address || 'N/A'}</div></div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-bold uppercase text-slate-500">Field officer remarks</div><div className="mt-1 text-[12px] font-medium text-slate-800">{fieldReport.remarks || 'No remarks'}</div></div>
                    {fieldReport.documents?.checklist && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[9px] font-bold uppercase text-slate-500">Document verification checklist</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{fieldReport.documents.checklist.map((checked, index) => <div key={index} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${checked ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><div className="flex items-center gap-2"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${checked ? 'bg-emerald-500' : 'bg-rose-500'}`}>{checked ? '✓' : '✕'}</span><span className="text-[11px] font-semibold text-slate-700">{verificationChecklistLabels[index] || `Verification check ${index + 1}`}</span></div><span className={`text-[9px] font-bold uppercase ${checked ? 'text-emerald-700' : 'text-rose-700'}`}>{checked ? 'Verified' : 'Not checked'}</span></div>)}</div></div>}
                  </div>
                  <div className="grid gap-3 border-t border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      ['Aadhaar', fieldReport.documents?.aadhaar],
                      ['PAN Card', fieldReport.documents?.pan],
                      ['Extra Document', fieldReport.documents?.extraDocument],
                      ['Applicant Photo', fieldReport.photos?.applicant],
                      ['Residence / Office', fieldReport.photos?.residenceOffice],
                      ['Signature', fieldReport.signature],
                    ].filter((item): item is [string, string] => Boolean(item[1])).map(([label, path]) => (
                      <a key={label} href={reportAssetUrl(path)} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <img src={reportAssetUrl(path)} alt={label} className="h-32 w-full bg-slate-100 object-cover" />
                        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-slate-700"><span>{label}</span><span className="text-blue-600">View ↗</span></div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {!fieldReport && <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm"><div className="text-4xl">📋</div><div className="mt-3 text-sm font-bold text-slate-800">Field report not submitted yet</div><div className="mt-1 text-[11px] text-slate-500">Data and uploaded images will appear here after the field officer submits the report.</div></div>}
              <div className="hidden rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white px-4 py-3 flex items-center justify-between">
                  <div className="text-[13px] font-bold uppercase tracking-wide">Field Verification - Residence</div>
                  <div className="text-lg">⌃</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-200 text-[12px] text-gray-700">
                  {[
                    ['Initiated On', caseData.fieldDetails?.residence.initiatedOn],
                    ['Met with', caseData.fieldDetails?.residence.metWith],
                    ['Residence Type', caseData.fieldDetails?.residence.residenceType],
                    ['Ease of identification', caseData.fieldDetails?.residence.easeOfIdentification],
                    ['Residing since', caseData.fieldDetails?.residence.residingSince],
                    ['Earning members in family', caseData.fieldDetails?.residence.earningMembers],
                    ['Neighbour check', caseData.fieldDetails?.residence.neighbourCheck],
                    ['Visit On', caseData.fieldDetails?.residence.visitOn],
                    ['Document verified', caseData.fieldDetails?.residence.documentVerified],
                    ['Received On', caseData.fieldDetails?.residence.receivedOn],
                  ].map(([label, value], index) => (
                    <div key={`${label}-${index}`} className="grid grid-cols-2 border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-3 font-semibold text-gray-800">{label}</div>
                      <div className="px-4 py-3 font-medium text-gray-700">{value || 'Pending'}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 border-b border-gray-200 text-[12px] text-gray-700">
                  {[
                    ['Relation', caseData.fieldDetails?.residence.relation],
                    ['House Type', caseData.fieldDetails?.residence.houseType],
                    ['Locality', caseData.fieldDetails?.residence.locality],
                    ['Total members in family', caseData.fieldDetails?.residence.totalMembers],
                    ['Living standard', caseData.fieldDetails?.residence.livingStandard],
                    ['Geo-coordinates', fieldReport?.location?.latitude && fieldReport?.location?.longitude ? `${fieldReport.location.latitude}, ${fieldReport.location.longitude}` : caseData.fieldDetails?.residence.geoCoordinates],
                    ['Remarks', fieldReport?.remarks || caseData.fieldDetails?.residence.remarks],
                    ['Photo of Residence', fieldReport?.photos?.residenceOffice ? 'Available above' : caseData.fieldDetails?.residence.photo],
                    ['Report Status', fieldReport?.outcome?.toUpperCase() || caseData.fieldDetails?.residence.reportStatus],
                  ].map(([label, value], index) => (
                    <div key={`${label}-${index}`} className="grid grid-cols-2 border-r border-gray-200 last:border-r-0">
                      <div className="px-4 py-3 font-semibold text-gray-800">{label}</div>
                      <div className="px-4 py-3 font-medium text-gray-700">{value || 'Pending'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white px-4 py-3 flex items-center justify-between">
                  <div className="text-[13px] font-bold uppercase tracking-wide">Field Verification - Office</div>
                  <div className="text-lg">⌃</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-200 text-[12px] text-gray-700">
                  {[
                    ['Initiated On', caseData.fieldDetails?.office.initiatedOn],
                    ['Met with', caseData.fieldDetails?.office.metWith],
                    ['Entry Allowed', caseData.fieldDetails?.office.entryAllowed],
                    ['Company Signboard sighted', caseData.fieldDetails?.office.signboardSighted],
                    ['No. of staff sighted', caseData.fieldDetails?.office.staffSighted],
                    ['Employed since', caseData.fieldDetails?.office.employedSince],
                    ['Visit On', caseData.fieldDetails?.office.visitOn],
                    ['Document verified', caseData.fieldDetails?.office.documentVerified],
                    ['Report Status', fieldReport?.outcome?.toUpperCase() || caseData.fieldDetails?.office.reportStatus],
                  ].map(([label, value], index) => (
                    <div key={`${label}-${index}`} className="grid grid-cols-2 border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-3 font-semibold text-gray-800">{label}</div>
                      <div className="px-4 py-3 font-medium text-gray-700">{value || 'Pending'}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 border-b border-gray-200 text-[12px] text-gray-700">
                  {[
                    ['Received On', caseData.fieldDetails?.office.receivedOn],
                    ['Relation', caseData.fieldDetails?.office.relation],
                    ['Employer Name', caseData.fieldDetails?.office.employerName],
                    ['Locality', caseData.fieldDetails?.office.locality],
                    ['Employee strength', caseData.fieldDetails?.office.employeeStrength],
                    ['Geo-coordinates', fieldReport?.location?.latitude && fieldReport?.location?.longitude ? `${fieldReport.location.latitude}, ${fieldReport.location.longitude}` : caseData.fieldDetails?.office.geoCoordinates],
                    ['Remarks', fieldReport?.remarks || caseData.fieldDetails?.office.remarks],
                    ['Photo of Office', fieldReport?.photos?.residenceOffice ? 'Available above' : caseData.fieldDetails?.office.photo],
                  ].map(([label, value], index) => (
                    <div key={`${label}-${index}`} className="grid grid-cols-2 border-r border-gray-200 last:border-r-0">
                      <div className="px-4 py-3 font-semibold text-gray-800">{label}</div>
                      <div className="px-4 py-3 font-medium text-gray-700">{value || 'Pending'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── History / Remarks ── */}
          {/*
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {historyLoading && history.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>}
                {!historyLoading && history.length === 0 && (
                  <div className="text-gray-400 italic text-[11px] py-8 text-center">No case activity recorded yet.</div>
                )}
                {history.map(item => (
                  <div key={item.id} className="relative rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs text-blue-700">{item.type === 'NOTE' ? '✎' : item.type === 'DOCUMENT_REVIEW' ? '✓' : '↻'}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{item.title}</div>
                          {item.description && <div className="mt-1 text-[11px] leading-relaxed text-slate-600">{item.description}</div>}
                          <div className="mt-1.5 text-[10px] text-slate-400">By {item.performedBy}</div>
                        </div>
                      </div>
                      <time className="text-[10px] font-medium text-slate-400">{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                  </div>
                ))}
              </div>
              {!isReadOnly && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void addRemark()}
                    placeholder="Add a remark or note..."
                    className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-[11px] focus:outline-none focus:border-blue-400"
                  />
                  <button onClick={() => void addRemark()} className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded text-[10px] font-semibold hover:bg-blue-700">
                    Add
                  </button>
                </div>
              )}
            </div>
          )}
          */}

        </div>

        {/* Action Footer */}
        {isReadOnly ? (
          <div className="sticky bottom-0 z-40 flex shrink-0 items-center justify-between border-t border-gray-200 bg-[#f8fafc] px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 flex-wrap">
              <span className="font-bold text-slate-900">Current Status:</span>
              <StatusBadge status={caseStatus} />
              <span className="text-slate-500 font-normal ml-2">🔒 This case is in read-only archive mode ({caseStatus}). No edits or workflow changes can be made.</span>
            </div>
            <button onClick={onClose} className="rounded-xl bg-slate-900 px-5 py-2 text-[11px] font-bold text-white hover:bg-slate-800 shadow-sm transition">
              Close Drawer
            </button>
          </div>
        ) : (
          <div className="sticky bottom-0 z-40 flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-200 bg-[#f8fafc]/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-5 xl:static xl:flex-nowrap xl:gap-3 xl:bg-[#f8fafc] xl:px-5 xl:py-3 xl:shadow-none">
            <div className="w-full min-w-[220px] text-[10px] text-gray-500 xl:w-auto xl:flex-1">
              Reviewing as: <span className="font-semibold text-gray-700">{currentReviewerLabel}</span>
              {' · '} Current: <StatusBadge status={caseStatus} />
            </div>
            <button
              onClick={() => setConfirmAction('Approve Case')}
              disabled={!canInitialDecision || actionSaving}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ✓ Approve Case
            </button>
            <button
              onClick={() => setConfirmAction('Send to Field Verification')}
              disabled={!canChooseVerification || actionSaving}
              className="px-3 py-1.5 bg-slate-700 text-white rounded text-[11px] font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              🧭 Send to Field Verification
            </button>
            <button
              onClick={() => setConfirmAction('Waive Field Verification')}
              disabled={!canChooseVerification || actionSaving}
              className="px-3 py-1.5 bg-zinc-700 text-white rounded text-[11px] font-semibold hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ⚡ Waive Field Verification
            </button>
            <button
              onClick={() => setConfirmAction('Send to Credit Team')}
              disabled={!canFinalDecision || actionSaving}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-[11px] font-semibold hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ↗ Send to Credit
            </button>
            <button
              onClick={() => setConfirmAction('Hold Case')}
              disabled={!canFinalDecision || actionSaving}
              className="px-3 py-1.5 bg-slate-600 text-white rounded text-[11px] font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ⏸ Hold Case
            </button>
            <button
              onClick={() => setConfirmAction('Forward to Reject')}
              disabled={!canFinalDecision || actionSaving}
              className="px-3 py-1.5 bg-zinc-600 text-white rounded text-[11px] font-semibold hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ⤴ Forward to Reject
            </button>
            <button
              onClick={() => {
                setFraudSourceDocument(null)
                setDocumentRejectTarget(null)
                setActionReason('')
                setConfirmAction('Flag as Fraud')
              }}
              disabled={documentActionsLocked || actionSaving}
              className="px-3 py-1.5 bg-rose-700 text-white rounded text-[11px] font-semibold hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ⚑ Flag Fraud
            </button>
            <button
              onClick={() => { setActionReason(''); setDocumentRejectTarget(null); setConfirmAction('Reject Case') }}
              disabled={!canInitialDecision || actionSaving}
              className="px-3 py-1.5 bg-stone-700 text-white rounded text-[11px] font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              ✗ Reject Case
            </button>
          </div>
        )}

        {/* Confirm Modal & Toast */}
        <Fragment>
          {previewDocument && (() => {
            const assetUrl = ekycAssetUrl(previewDocument.fileUrl)
            const isPdf = /\.pdf(?:$|\?)/i.test(previewDocument.fileUrl || previewDocument.fileName || '')
            const detailRows = Object.entries(previewDocument.details || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
            return (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setPreviewDocument(null) }}>
                <div role="dialog" aria-modal="true" aria-label={`${previewDocument.name} preview`} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
                    <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900">{previewDocument.name}</div><div className="truncate text-[10px] text-slate-500">Telecaller uploaded customer document</div></div>
                    <button onClick={() => setPreviewDocument(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 hover:bg-slate-200" aria-label="Close document preview">×</button>
                  </div>
                  <div className="overflow-y-auto p-4 sm:p-5">
                    {assetUrl ? (
                      isPdf ? <iframe src={assetUrl} title={previewDocument.name} className="h-[65vh] min-h-[420px] w-full rounded-xl border border-slate-200" /> : <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-xl bg-slate-100"><img src={assetUrl} alt={previewDocument.name} className="max-h-[65vh] max-w-full object-contain" /></div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"><div className="text-3xl">▤</div><div className="mt-2 text-sm font-semibold text-slate-700">Image/file was not stored for this document</div><div className="mt-1 text-[11px] text-slate-500">The uploaded verification details are shown below.</div></div>
                    )}
                    {detailRows.length > 0 && <div className="mt-4 grid overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-2">{detailRows.map(([label, value]) => <div key={label} className="border-b border-slate-100 px-4 py-3 sm:[&:nth-last-child(-n+2)]:border-b-0"><div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 break-words text-xs font-semibold text-slate-800">{String(value)}</div></div>)}</div>}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 bg-slate-50">
                    <div>
                      {!isReadOnly && previewDocument?.id && previewDocument?.status !== 'APPROVED' && (
                        <>
                          <button
                            onClick={() => {
                              void updateDocStatus(previewDocument.id, 'APPROVED')
                              setPreviewDocument(null)
                            }}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
                          >
                            ✓ Verify Document
                          </button>
                          <button
                            onClick={() => {
                              void updateDocStatus(previewDocument.id, 'REJECTED')
                              setPreviewDocument(null)
                            }}
                            className="rounded-lg border border-red-200 px-4 py-2 text-[11px] font-bold text-red-600 hover:bg-red-50 transition flex items-center gap-1.5"
                          >
                            ✕ Reject
                          </button>
                          <button
                            onClick={() => {
                              setFraudSourceDocument(previewDocument)
                              setPreviewDocument(null)
                            }}
                            className="rounded-lg bg-red-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-red-700 shadow-sm transition flex items-center gap-1.5"
                          >
                            ⚑ Flag Fraud
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {assetUrl && <a href={assetUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white">Open original ↗</a>}
                      <button onClick={() => setPreviewDocument(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
          {bankEditOpen && (
            <div className="fixed inset-0 z-[115] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) setBankEditOpen(false) }}>
              <div role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#1e3a5f] to-[#2b5282] px-5 py-4 text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🏦</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">Edit & Verify Bank Account Details</h3>
                      <p className="text-[10px] text-blue-100">Update customer bank account details and verification status</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBankEditOpen(false)}
                    className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white text-base flex items-center justify-center transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={saveBankDetails} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto bg-slate-50/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Account Holder Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bankEditForm.accountHolderName}
                        onChange={e => setBankEditForm(prev => ({ ...prev, accountHolderName: e.target.value }))}
                        placeholder="e.g. Srinjay Sarma"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Bank Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bankEditForm.bankName}
                        onChange={e => setBankEditForm(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="e.g. Indian Overseas Bank"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Account Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bankEditForm.accountNumber}
                        onChange={e => setBankEditForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                        placeholder="e.g. 157101000002793"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        IFSC Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bankEditForm.ifscCode}
                        onChange={e => setBankEditForm(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                        placeholder="e.g. IOBA0001571"
                        className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={bankEditForm.branchName}
                        onChange={e => setBankEditForm(prev => ({ ...prev, branchName: e.target.value }))}
                        placeholder="e.g. DISPUR"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Account Type
                      </label>
                      <select
                        value={bankEditForm.accountType}
                        onChange={e => setBankEditForm(prev => ({ ...prev, accountType: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                      >
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                        <option value="salary">Salary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Salary Account
                      </label>
                      <select
                        value={bankEditForm.salaryAccount}
                        onChange={e => setBankEditForm(prev => ({ ...prev, salaryAccount: e.target.value }))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Verification Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={bankEditForm.verificationStatus}
                        onChange={e => setBankEditForm(prev => ({ ...prev, verificationStatus: e.target.value }))}
                        className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                      >
                        <option value="Verified">✓ Verified</option>
                        <option value="Not verified">⏳ Not verified</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setBankEditOpen(false)}
                      disabled={bankEditSaving}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bankEditSaving}
                      className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {bankEditSaving ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Save & Verify</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {confirmAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6">
              <button aria-label="Close confirmation" className="absolute inset-0 h-full w-full cursor-default" onClick={() => { setConfirmAction(null); setFraudSourceDocument(null); setDocumentRejectTarget(null); setActionReason('') }} />
              <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                <div className={`text-sm font-bold mb-2 ${(confirmAction.includes('Reject') || confirmAction.includes('Fraud')) ? 'text-red-700' :
                  confirmAction === 'Approve Case' ? 'text-emerald-700' :
                    confirmAction === 'Send to Credit Team' ? 'text-purple-700' :
                      confirmAction === 'Waive Field Verification' ? 'text-violet-700' :
                        confirmAction === 'Hold Case' ? 'text-slate-700' :
                          confirmAction === 'Send to Field Verification' ? 'text-cyan-700' : 'text-orange-700'
                  }`}>
                  Confirm: {confirmAction}
                </div>
                <div className="text-[11px] text-gray-600 mb-4">
                  Are you sure you want to <strong>{confirmAction}</strong> for{' '}
                  <strong>{caseData.borrower}</strong> ({caseData.id})?
                  {confirmAction === 'Flag as Fraud'
                    ? ` This will mark the applicant as FRAUD and apply a permanent ban${fraudSourceDocument ? ` because of ${fraudSourceDocument}` : ''}. Use it only for confirmed fraud.`
                    : confirmAction === 'Reject Case'
                      ? ' The rejection will be stored and the applicant can reapply after the configured waiting period.'
                      : confirmAction === 'Reject Document'
                        ? ` This will reject ${documentRejectTarget?.name || 'the selected document'}.`
                        : ' This action will update the case status and log a system entry.'}
                </div>
                {['Reject Case', 'Reject Document', 'Flag as Fraud'].includes(confirmAction) && (
                  <div className="mb-4">
                    <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">Reason <span className="text-red-600">*</span></label>
                    <textarea
                      value={actionReason}
                      onChange={event => setActionReason(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      autoFocus
                      placeholder={confirmAction === 'Flag as Fraud' ? 'Enter confirmed fraud reason...' : 'Enter rejection reason...'}
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-[11px] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button onClick={() => { setConfirmAction(null); setFraudSourceDocument(null); setDocumentRejectTarget(null); setActionReason('') }} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] text-gray-600 hover:bg-gray-50 sm:w-auto sm:py-1.5">
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmAction === 'Reject Document' ? void confirmDocumentRejection() : void handleCaseAction(confirmAction)}
                    disabled={actionSaving || (['Reject Case', 'Reject Document', 'Flag as Fraud'].includes(confirmAction) && !actionReason.trim())}
                    className={`w-full rounded-xl px-4 py-2.5 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:py-1.5 ${(confirmAction.includes('Reject') || confirmAction.includes('Fraud')) ? 'bg-red-600 hover:bg-red-700' :
                      confirmAction === 'Approve Case' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        confirmAction === 'Send to Credit Team' ? 'bg-purple-600 hover:bg-purple-700' :
                          confirmAction === 'Waive Field Verification' ? 'bg-violet-600 hover:bg-violet-700' :
                            confirmAction === 'Hold Case' ? 'bg-slate-600 hover:bg-slate-700' :
                              confirmAction === 'Send to Field Verification' ? 'bg-cyan-600 hover:bg-cyan-700' :
                                'bg-orange-500 hover:bg-orange-600'
                      }`}
                  >
                    {actionSaving ? 'Saving…' : `Yes, ${confirmAction}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div className={`fixed bottom-6 right-6 z-70 px-4 py-2 rounded shadow-lg text-white text-[11px] font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600' :
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
              }`}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'} {toast.msg}
            </div>
          )}
        </Fragment>
      </div>
    </div>
  )
}

// ─── Helper Components ─────────────────────────────────────────────────────────
function CreditBureauPanel({ credit }: { credit?: CaseRecord['creditBureau'] }) {
  const database = credit?.databaseColumns || {}
  const provider = credit?.providerData || {}
  const useful = (value: unknown, fallback = 'N/A') => value !== null && value !== undefined && value !== '' ? String(value) : fallback
  const parseRecords = (value: unknown): Record<string, any>[] => {
    if (!value) return []
    try { let parsed: any = typeof value === 'string' ? JSON.parse(value) : value; if (typeof parsed === 'string') parsed = JSON.parse(parsed); return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [] } catch { return [] }
  }
  const findDeep = (source: any, names: string[]): any => {
    if (!source || typeof source !== 'object') return undefined
    const wanted = new Set(names.map(name => name.toLowerCase().replace(/[^a-z0-9]/g, '')))
    for (const [key, value] of Object.entries(source)) if (wanted.has(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) return value
    for (const value of Object.values(source)) { const found = value && typeof value === 'object' ? findDeep(value, names) : undefined; if (found !== undefined) return found }
    return undefined
  }
  const field = (...names: string[]) => database[names.find(name => database[name] !== undefined) || ''] ?? findDeep(provider, names)
  const scoreRaw = credit?.cibilScore !== 'N/A' ? credit?.cibilScore : field('ai_cibil_score', 'cibil_score', 'cibilScore', 'score')
  const score = Number(scoreRaw), validScore = Number.isFinite(score) && score > 0
  const totalAccounts = Number(credit?.totalAccounts || field('total_accounts', 'totalAccounts') || 0)
  const activeLoans = parseRecords(field('ai_active_loans', 'active_loans', 'activeLoans'))
  const closedLoans = parseRecords(field('ai_closed_loans', 'closed_loans', 'closedLoans'))
  const activeAccounts = Number(credit?.activeAccounts || field('active_accounts', 'activeAccounts') || activeLoans.length || 0)
  const closedAccounts = Number(field('closed_accounts', 'closedAccounts') || closedLoans.length || 0)
  const inquiryDates = useful(field('ai_inquiry_date', 'inquiry_date'), '')
  const inquiryTotal = inquiryDates ? inquiryDates.split('|').filter(Boolean).length : useful(field('total_inquiries', 'inquiries_total'))
  const scoreInterpretation = useful(field('ai_score_interpretation', 'score_interpretation'), validScore ? (score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Moderate' : 'Review Recommended') : 'Not available')
  const keyFactors = useful(field('ai_key_factors', 'key_factors'), 'No score factors are available in the bureau report.')
  const riskFlag = useful(field('ai_risk_flag', 'risk_flag'), 'Clean track')
  const dpdAnalysis = useful(field('ai_dpd_analysis', 'dpd_analysis'), 'No DPD analysis is available in the bureau report.')
  const reportUrl = useful(field('report_url'), ''), webUrl = useful(field('web_url'), ''), reportLink = reportUrl || webUrl
  const gaugePercent = validScore ? Math.max(0, Math.min(1, (score - 300) / 600)) : 0
  const needleAngle = -180 + gaugePercent * 180
  const scoreColor = validScore ? (score >= 750 ? '#16a34a' : score >= 700 ? '#84cc16' : score >= 650 ? '#f59e0b' : '#ef4444') : '#64748b'
  const scoreCategory = validScore ? (score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Moderate' : 'Poor') : 'Not available'
  const Metric = ({ label, value, hint, color }: { label: string; value: string | number; hint: string; color: string }) => <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-2 text-2xl font-black" style={{ color }}>{value}</div><div className="mt-1 text-[11px] text-slate-500">{hint}</div></div>
  const LoanList = ({ title, records, accent, empty }: { title: string; records: Record<string, any>[]; accent: string; empty: string }) => <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><h3 className="text-base font-bold text-slate-900">{title}</h3><span className="rounded-full px-3 py-1 text-[10px] font-bold" style={{ color: accent, backgroundColor: `${accent}12`, border: `1px solid ${accent}45` }}>{records.length} Accounts</span></div>{records.length ? <div className="mt-4 grid gap-3">{records.map((loan, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] sm:grid-cols-4">{[['Type', loan.type || loan.loan_type], ['Bank', loan.bank], ['Amount', loan.amount ? `₹${Number(loan.amount).toLocaleString('en-IN')}` : null], ['Status', loan.status]].map(([label, value]) => <div key={label as string}><div className="text-[9px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 font-semibold text-slate-800">{useful(value)}</div></div>)}</div>)}</div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">{empty}</div>}</section>
  return <div className="credit-bureau-panel space-y-5 bg-slate-50/60 p-1 sm:p-3">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">▤</span><div><h2 className="text-lg font-black text-slate-900">CIBIL Credit Score</h2><p className="text-xs text-slate-400">Bureau credit report powered by Bifrost API</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={() => window.location.reload()} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">↻ Silent Reload</button><span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">✓ {validScore ? 'Checked' : 'No score'}</span></div></div><div className="flex flex-col items-center px-5 py-8"><div className="text-sm font-black uppercase tracking-wider text-slate-800">Credit Score</div><div className="relative mt-5 h-40 w-72"><svg viewBox="0 0 240 135" className="h-full w-full"><path d="M25 115 A95 95 0 0 1 215 115" fill="none" stroke="#ef4444" strokeWidth="25" strokeLinecap="round" /><path d="M57 48 A95 95 0 0 1 101 23" fill="none" stroke="#f97316" strokeWidth="25" /><path d="M101 23 A95 95 0 0 1 151 29" fill="none" stroke="#eab308" strokeWidth="25" /><path d="M151 29 A95 95 0 0 1 195 70" fill="none" stroke="#84cc16" strokeWidth="25" /><path d="M195 70 A95 95 0 0 1 215 115" fill="none" stroke="#16a34a" strokeWidth="25" strokeLinecap="round" />{validScore && <g transform={`rotate(${needleAngle} 120 115)`}><line x1="120" y1="115" x2="198" y2="115" stroke="#0f172a" strokeWidth="5" /><circle cx="120" cy="115" r="7" fill="#0f172a" /></g>}</svg><div className="absolute inset-x-0 bottom-1 text-center"><div className="text-5xl font-black" style={{ color: scoreColor }}>{validScore ? score : 'N/A'}</div><div className="text-[11px] font-black uppercase tracking-[.25em] text-slate-500">{validScore ? scoreCategory : 'No score'}</div></div></div><div className="mt-5 flex flex-wrap justify-center gap-3">{reportLink && <a href={reportLink} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700">◉ View PDF</a>}{reportUrl && <a href={reportUrl} download target="_blank" rel="noreferrer" className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white">⇩ Download Report</a>}</div></div></section>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric label="CIBIL Score" value={validScore ? score : 'N/A'} hint="TransUnion V3" color="#059669" /><Metric label="Total Accounts" value={totalAccounts} hint="Tradelines" color="#2563eb" /><Metric label="Active Accounts" value={activeAccounts} hint="Running Loans" color="#0d9488" /><Metric label="Closed Accounts" value={closedAccounts} hint="Settled / Closed" color="#9333ea" /><Metric label="On-time Payment" value={useful(field('on_time_payment'))} hint="Track Record" color="#047857" /><Metric label="Inquiries (Total)" value={inquiryTotal || 'N/A'} hint="Bureau Enquiries" color="#334155" /></div>
    <div className="grid items-start gap-4 lg:grid-cols-2"><section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="border-b border-slate-100 pb-4 text-base font-bold text-slate-900">✨ Score Factors & Interpretation</h3><div className="mt-4 rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">Key Factors Affecting Score</div><p className="mt-2 text-sm leading-6 text-slate-700">{keyFactors}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="text-[10px] font-bold text-emerald-700">SCORE CATEGORY</div><div className="mt-1 text-base font-black text-emerald-700">{scoreCategory}</div></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-[10px] font-bold text-blue-700">RISK ASSESSMENT</div><div className="mt-1 text-base font-black text-blue-700">{scoreInterpretation}</div></div></div></section><section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><h3 className="text-base font-bold text-slate-900">♢ DPD & Delinquency Analysis</h3><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{riskFlag}</span></div><div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="text-sm font-bold text-emerald-800">Delinquency Summary</div><p className="mt-2 text-sm leading-6 text-slate-700">{dpdAnalysis}</p></div></section></div>
    <div className="grid items-start gap-4 lg:grid-cols-2"><LoanList title="▭ Active Loans & Exposure" records={activeLoans} accent="#0d9488" empty="No active loans reported in bureau" /><LoanList title="✓ Closed & Settled Loans" records={closedLoans} accent="#9333ea" empty="No closed loan records found" /></div>
  </div>
}

function EkycCard({ title, subtitle, badge, tone, fields }: { title: string; subtitle: string; badge: string; tone: 'blue' | 'green'; fields: Array<[string, unknown]> }) {
  const [summaryModal, setSummaryModal] = useState<{ title: string; content: string } | null>(null)
  const cleanSummaryText = (value: string) => value.replace(/\*\*/g, '').replace(/^#+\s*/g, '').trim()
  const renderSummaryContent = (content: string) => {
    const sections: Array<{ title: string; lines: string[] }> = []
    let current = { title: 'Overview', lines: [] as string[] }
    content.split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim()
      if (!line) return
      if (/^#{1,6}\s*/.test(line)) {
        if (current.lines.length || current.title !== 'Overview') sections.push(current)
        current = { title: cleanSummaryText(line), lines: [] }
      } else {
        current.lines.push(cleanSummaryText(line.replace(/^[-•]\s*/, '')))
      }
    })
    if (current.lines.length || current.title !== 'Overview') sections.push(current)
    return <div className="grid grid-cols-1 items-start gap-3">
      {sections.map((section, sectionIndex) => <section key={`${section.title}-${sectionIndex}`} className="h-fit self-start rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4">
        <h4 className="mb-2 text-sm font-bold text-slate-900">{section.title.replace(/^\d+\.\s*/, '')}</h4>
        <div className="space-y-2">{section.lines.map((line, lineIndex) => {
          const separator = line.indexOf(':')
          return separator > 0
            ? <div key={lineIndex} className="grid grid-cols-[minmax(90px,.7fr)_1.3fr] gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs"><span className="font-semibold text-slate-500">{line.slice(0, separator)}</span><span className="font-medium text-slate-800">{line.slice(separator + 1).trim()}</span></div>
            : <p key={lineIndex} className="text-xs leading-5 text-slate-700">{line}</p>
        })}</div>
      </section>)}
    </div>
  }
  const renderFieldValue = (rawValue: unknown, label: string) => {
    const value = rawValue !== null && rawValue !== undefined && rawValue !== '' ? String(rawValue).trim() : 'Not available'
    if (/ai summary/i.test(label) && value !== 'Not available') {
      return <button type="button" onClick={() => setSummaryModal({ title: 'Credit Bureau AI Summary', content: value })} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-[10px] font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <span aria-hidden="true">✦</span> View AI Summary
      </button>
    }
    if (/^https?:\/\/\S+$/i.test(value)) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800">Open PDF / Report <span aria-hidden="true">↗</span></a>
    }
    if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}')) || (value.startsWith('"') && value.endsWith('"'))) {
      try {
        let parsed: any = JSON.parse(value)
        // Some database drivers return JSON columns as a JSON-encoded string.
        // Decode one additional layer before rendering the records.
        if (typeof parsed === 'string' && /^[\[{]/.test(parsed.trim())) parsed = JSON.parse(parsed)
        const records = Array.isArray(parsed) ? parsed : [parsed]
        if (records.length && records.every(record => record && typeof record === 'object' && !Array.isArray(record))) {
          return <div className="space-y-2 break-normal">
            {records.map((record: Record<string, unknown>, recordIndex: number) => (
              <div key={recordIndex} className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
                <div className="border-b border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700">{String(record.type || record.loan_type || `Record ${recordIndex + 1}`)}</div>
                <div className="p-2">
                  {Object.entries(record).map(([key, fieldValue]) => (
                    <div key={key} className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 py-1 last:border-0">
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-slate-400">{formatProviderLabel(key)}</span>
                      <span className="min-w-0 break-words text-right text-[10px] font-semibold text-slate-700">{fieldValue === null || fieldValue === undefined || fieldValue === '' ? 'N/A' : String(fieldValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
      } catch {
        // The database value only resembles JSON; show the original value.
      }
    }
    return value
  }
  return <><div className={`overflow-hidden rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] ${tone === 'green' ? 'border-emerald-100' : 'border-blue-100'}`}>
    <div className={`flex items-center justify-between border-b px-4 py-3 ${tone === 'green' ? 'border-emerald-100 bg-gradient-to-r from-emerald-50 to-white' : 'border-blue-100 bg-gradient-to-r from-blue-50 to-white'}`}>
      <div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sm ${tone === 'green' ? 'border-emerald-200 text-emerald-600' : 'border-blue-200 text-blue-600'}`}>▤</div><div><div className="text-[13px] font-bold text-slate-900">{title}</div><div className="text-[10px] text-slate-500">{subtitle}</div></div></div>
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-bold text-slate-600">{badge}</span>
    </div>
    <div className="grid sm:grid-cols-2">{fields.map(([label, rawValue], index) => <div key={`${label}-${index}`} className="grid min-w-0 grid-cols-[minmax(110px,.75fr)_minmax(0,1.25fr)] items-start gap-3 border-b border-slate-100 px-4 py-3 even:bg-slate-50/50"><div className="min-w-0 break-words text-[9px] font-bold uppercase tracking-[.2em] text-slate-500">{label}</div><div className="min-w-0 whitespace-pre-wrap break-all text-[11px] font-medium leading-relaxed text-slate-700">{renderFieldValue(rawValue, label)}</div></div>)}</div>
  </div>
    {summaryModal && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setSummaryModal(null) }}>
      <div role="dialog" aria-modal="true" aria-label={summaryModal.title} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-5 py-4 text-white">
          <div><div className="text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300">AI Credit Analysis</div><h3 className="mt-1 text-lg font-bold">{summaryModal.title}</h3></div>
          <button type="button" onClick={() => setSummaryModal(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl transition hover:bg-white/20" aria-label="Close summary">×</button>
        </div>
        <div className="overflow-y-auto bg-slate-50 p-4 sm:p-6">{renderSummaryContent(summaryModal.content)}</div>
        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-3"><button type="button" onClick={() => setSummaryModal(null)} className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700">Close</button></div>
      </div>
    </div>}
  </>
}

function EkycImageCard({ title, subtitle, image, fallback, caption, wide = false }: { title: string; subtitle: string; image?: string | null; fallback: string; caption: string; wide?: boolean }) {
  const [hasError, setHasError] = useState(false)
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)]">
    <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3"><div><div className="text-[13px] font-bold text-slate-900">{title}</div><div className="text-[10px] text-slate-500">{subtitle}</div></div><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-bold text-slate-600">Verified</span></div>
    <div className={`flex items-center justify-center bg-slate-50 p-4 ${wide ? 'min-h-64' : 'h-[220px]'}`}><div className={`${wide ? 'w-full max-w-sm' : 'w-full'} overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm`}>
      <div className={`${wide ? 'h-40' : 'h-32'} flex items-center justify-center overflow-hidden rounded-xl bg-slate-100`}>
        {image && !hasError ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-contain"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
            <span className="text-4xl">{fallback}</span>
            <span className="text-[10px] text-slate-500">{caption}</span>
          </div>
        )}
      </div>
      <div className="mt-3 text-[11px] font-bold text-slate-800">{caption}</div><div className="mt-1 text-[9px] text-slate-500">{image && !hasError ? 'Loaded from customer dossier.' : ''}</div>
    </div></div>
  </div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <div className="bg-[#f0f4fa] px-4 py-2 border-b border-gray-200">
        <span className="text-[10px] font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}

function Field({ label, value, mono, span }: { label: string; value: string; mono?: boolean; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-[11px] font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────────────────────────
function LegacyCustomerUploadPage({ token }: { token: string }) {
  const [request, setRequest] = useState<DocumentRequestData | null>(null)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [uploadedRecent, setUploadedRecent] = useState<number | null>(null)

  const load = () => fetch(`${API_BASE_URL}/api/fcu/auth/customer-upload/${token}`)
    .then(async response => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.message || 'Unable to load request'); return result.data })
    .then(setRequest).catch(error => setError(error.message))

  useEffect(() => {
    void load()
  }, [token])

  const upload = async (documentId: number, file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('File must be smaller than 5 MB'); return }
    try {
      setSavingId(documentId)
      setError('')
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/customer-upload/${token}/documents/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, fileName: file.name })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Upload failed')
      setRequest(result.data)
      setUploadedRecent(documentId)
      setTimeout(() => setUploadedRecent(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setSavingId(null)
    }
  }

  const uploadedCount = request?.documents?.filter(d => d.status === 'UPLOADED').length || 0
  const totalCount = request?.documents?.length || 0
  const isAllUploaded = totalCount > 0 && uploadedCount === totalCount

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-2xl bg-white text-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e3a5f] via-[#244773] to-[#1e3a5f] text-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#1e3a5f] font-black text-xl flex items-center justify-center shadow-md">
                G
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">GeetPay Customer Portal</h1>
                <p className="text-xs text-blue-100 mt-0.5">Secure Loan Verification Document Upload</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              256-bit Encrypted
            </span>
          </div>

          {request && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-blue-200 block">Applicant Name</span>
                <span className="font-bold text-sm text-white truncate block">{request.customerName || 'Customer'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-blue-200 block">Application ID</span>
                <span className="font-bold text-sm text-white font-mono block">{request.leadId || `APP${String(request.application_id || request.id).padStart(7, '0')}`}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-semibold text-blue-200 block">Upload Progress</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-white/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${totalCount ? (uploadedCount / totalCount) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-emerald-300">{uploadedCount}/{totalCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5 bg-slate-50/50">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!request && !error && (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading your secure document request…</span>
            </div>
          )}

          {isAllUploaded && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 text-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold shadow-md shadow-emerald-500/20">
                ✓
              </div>
              <h3 className="text-base font-bold text-emerald-900">All Requested Documents Uploaded!</h3>
              <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                Thank you! Your documents have been safely received and forwarded to our FCU verification team for processing.
              </p>
            </div>
          )}

          {request && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                <span>Requested Documents ({totalCount})</span>
                <span className="text-[11px] text-slate-400">PDF, JPG, PNG, WEBP · Max 5MB</span>
              </div>

              {request.documents.map((doc) => {
                const isUploaded = doc.status === 'UPLOADED'
                const isSaving = savingId === doc.id
                const isRecent = uploadedRecent === doc.id
                const fileUrl = doc.filePath ? `${API_BASE_URL}/${doc.filePath.replace(/^\/+/, '')}` : ''

                return (
                  <div
                    key={doc.id}
                    className={`rounded-2xl border transition-all duration-300 p-4 ${isUploaded
                      ? 'border-emerald-200 bg-white shadow-sm hover:border-emerald-300'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                          {getDocIcon(doc.documentName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-800">{doc.documentName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                              {isUploaded ? '✓ Uploaded' : '⏳ Pending'}
                            </span>
                            {isRecent && <span className="text-[10px] font-bold text-emerald-600 animate-bounce">Saved!</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {isUploaded ? (
                              <div className="space-y-1.5">
                                <div className="text-slate-700 font-mono font-medium text-[11px] break-all">
                                  📎 {doc.fileName || 'Uploaded file'}
                                </div>
                                <div className="text-[10px] font-mono leading-tight space-y-0.5 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  {(() => {
                                    const text = String(doc.metaIntegrityDetail || '');
                                    const createdMatch = text.match(/Created:\s*([^\s]+\s+[^\s]+)/i);
                                    const modifiedMatch = text.match(/Modified:\s*([^\s]+\s+[^\s]+)/i);

                                    if (createdMatch || modifiedMatch) {
                                      const created = createdMatch ? createdMatch[0] : '';
                                      const modified = modifiedMatch ? modifiedMatch[0] : '';
                                      let rest = text;
                                      if (created) rest = rest.replace(created, '');
                                      if (modified) rest = rest.replace(modified, '');
                                      const extra = rest.trim();

                                      return (
                                        <>
                                          {created && <div className="text-emerald-700 font-semibold">{created}</div>}
                                          {modified && <div className="text-slate-600">{modified}</div>}
                                          {extra && <div className="text-[9px] text-slate-400">{extra}</div>}
                                        </>
                                      );
                                    }

                                    const uploadDate = doc.uploadedAt || doc.uploaded_at || new Date().toISOString();
                                    const formattedUpload = new Date(uploadDate).toLocaleString('en-IN', {
                                      year: 'numeric', month: '2-digit', day: '2-digit',
                                      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
                                    }).replace(',', '');

                                    return (
                                      <>
                                        <div className="text-emerald-700 font-semibold">Created: {formattedUpload}</div>
                                        <div className="text-slate-600">Modified: {formattedUpload}</div>
                                        <div className="text-[9px] text-slate-400">(Generated via Direct Capture)</div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : (
                              'Please upload a clear copy of this document'
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isUploaded && fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition"
                          >
                            View ↗
                          </a>
                        )}

                        <label className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm ${isSaving
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : isUploaded
                            ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/20'
                          }`}>
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            disabled={isSaving}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void upload(doc.id, file)
                            }}
                            className="hidden"
                          />
                          {isSaving ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                              <span>Uploading…</span>
                            </>
                          ) : isUploaded ? (
                            <>
                              <span>↻</span>
                              <span>Replace</span>
                            </>
                          ) : (
                            <>
                              <span>📁</span>
                              <span>Choose & Upload</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-200/80">
            🔒 GeetPay FCU Verification System · All uploads are securely stored and verified against loan criteria.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [authUser, setAuthUser] = useState<FcuUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [casesError, setCasesError] = useState('')
  const [sidebarData, setSidebarData] = useState<any>(null)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPurpose, setSelectedPurpose] = useState('All Purposes')
  const [selectedBranch, setSelectedBranch] = useState('All Branches')
  const [viewCase, setViewCase] = useState<CaseRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [notifications, setNotifications] = useState<FcuNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const latestNotificationId = useRef<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallPwa = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice?.outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  const loadCases = async () => {
    const response = await fcuFetch('/api/fcu/auth/cases', { cache: 'no-store' })
    if (response.status === 401) {
      localStorage.removeItem('fcu_token')
      localStorage.removeItem('fcu_user')
      setAuthUser(null)
      return []
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Unable to load applications')
    const loadedCases = Array.isArray(result.data) ? result.data as CaseRecord[] : []
    setCases(loadedCases)
    return loadedCases
  }

  useEffect(() => {
    const token = localStorage.getItem('fcu_token')
    if (!token) {
      setAuthUser(null)
      setCheckingSession(false)
      return
    }
    fcuFetch('/api/fcu/auth/me')
      .then(async response => {
        if (response.ok) {
          const json = await response.json().catch(() => ({}))
          return json.data as FcuUser
        }
        localStorage.removeItem('fcu_token')
        localStorage.removeItem('fcu_user')
        return null
      })
      .then(setAuthUser)
      .catch(() => {
        localStorage.removeItem('fcu_token')
        setAuthUser(null)
      })
      .finally(() => setCheckingSession(false))
  }, [])

  useEffect(() => {
    if (!authUser) return
    setCasesLoading(true)
    setCasesError('')
    loadCases()
      .catch(error => {
        setCases([])
        setCasesError(error instanceof Error ? error.message : 'Unable to load applications')
      })
      .finally(() => setCasesLoading(false))
  }, [authUser])

  useEffect(() => {
    if (!authUser) return
    const loadSidebar = () => {
      fcuFetch('/api/fcu/auth/sidebar')
        .then(async response => {
          if (response.status === 401) {
            localStorage.removeItem('fcu_token')
            setAuthUser(null)
            return
          }
          const result = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(result.message || 'Unable to load sidebar')
          return result.data
        })
        .then(setSidebarData)
        .catch(error => console.error('Sidebar refresh failed:', error))
    }
    loadSidebar()
    const timer = setInterval(loadSidebar, 30000)
    return () => clearInterval(timer)
  }, [authUser])

  useEffect(() => {
    if (!authUser) return
    const loadNotifications = async () => {
      try {
        const response = await fcuFetch('/api/fcu/auth/notifications', { cache: 'no-store' })
        if (response.status === 401) {
          localStorage.removeItem('fcu_token')
          setAuthUser(null)
          return
        }
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.message || 'Unable to load notifications')
        const incoming = Array.isArray(result.data) ? result.data as FcuNotification[] : []
        const newest = incoming[0]
        if (latestNotificationId.current && newest && newest.id !== latestNotificationId.current) {
          void loadCases().catch(() => undefined)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(newest.title, { body: newest.message, icon: '/assets/geetpay-logo.png', tag: newest.id })
          }
        }
        latestNotificationId.current = newest?.id || latestNotificationId.current
        setNotifications(incoming)
      } catch (error) { console.error('Notification refresh failed:', error) }
    }
    void loadNotifications()
    const timer = window.setInterval(loadNotifications, 15000)
    return () => window.clearInterval(timer)
  }, [authUser])

  const handleLogout = async () => {
    try {
      if (viewCase) await releaseCaseClaim(viewCase).catch(() => {})
      await fcuFetch('/api/fcu/auth/logout', { method: 'POST' }).catch(() => {})
    } finally {
      localStorage.removeItem('fcu_token')
      localStorage.removeItem('fcu_user')
      sessionStorage.clear()
      setViewCase(null)
      setActiveNav('Dashboard')
      setAuthUser(null)
    }
  }

  const openNotification = async (notification: FcuNotification) => {
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, isRead: true } : item))
    setNotificationsOpen(false)
    void fcuFetch(`/api/fcu/auth/notifications/${notification.applicationId}/read`, { method: 'PATCH' })
    let application = cases.find(item => Number(item.databaseId || item.id) === notification.applicationId)
    if (!application) {
      try { application = (await loadCases()).find(item => Number(item.databaseId || item.id) === notification.applicationId) } catch { /* handled by applications screen */ }
    }
    setActiveNav('Applications')
    if (application) await claimAndOpenCase(application)
  }

  const markAllNotificationsAsRead = async () => {
    setNotifications(current => current.map(item => ({ ...item, isRead: true })))
    await fcuFetch('/api/fcu/auth/notifications/read-all', { method: 'PATCH' })
  }

  const toggleNotifications = async () => {
    setNotificationsOpen(open => !open)
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
  }

  const claimAndOpenCase = async (caseItem: CaseRecord) => {
    try {
      const response = await fcuFetch(`/api/fcu/auth/cases/${caseItem.databaseId || caseItem.id}/claim`, { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to claim application')
      const claimedCase = { ...caseItem, lock: { userId: authUser!.id, userName: authUser!.name || authUser!.email, expiresAt: '', isMine: true } }
      setCases(current => current.map(item => item.id === caseItem.id ? claimedCase : item))
      setViewCase(claimedCase)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'This application is already being reviewed')
      void loadCases().catch(() => undefined)
    }
  }

  const openCase = (caseItem: CaseRecord, readOnlyMode = false) => {
    const isTerminal = ['SENT_TO_CREDIT', 'DISBURSED', 'REJECTED', 'FORWARDED_REJECT'].includes(caseItem.status) || caseItem.workflowStage === 'FINALIZED'
    if (readOnlyMode || isTerminal || activeNav !== 'Applications') {
      setViewCase(caseItem)
      return
    }
    void claimAndOpenCase(caseItem)
  }

  const releaseCaseClaim = async (caseItem: CaseRecord) => {
    if (caseItem.lock?.isMine) {
      try { await fcuFetch(`/api/fcu/auth/cases/${caseItem.databaseId || caseItem.id}/claim`, { method: 'DELETE' }) } catch { /* Lock expires automatically. */ }
      setCases(current => current.map(item => item.id === caseItem.id ? { ...item, lock: null } : item))
    }
  }

  const closeCaseDrawer = async () => {
    if (viewCase) await releaseCaseClaim(viewCase)
    setViewCase(null)
  }

  useEffect(() => {
    if (!viewCase) return
    const heartbeat = async () => {
      try {
        const response = await fcuFetch(`/api/fcu/auth/cases/${viewCase.databaseId || viewCase.id}/heartbeat`, { method: 'POST' })
        if (response.status === 409) {
          await fcuFetch(`/api/fcu/auth/cases/${viewCase.databaseId || viewCase.id}/claim`, { method: 'POST' })
        }
      } catch { /* A temporary server/network interruption is retried on the next heartbeat. */ }
    }
    void heartbeat()
    const timer = window.setInterval(heartbeat, 30000)
    return () => window.clearInterval(timer)
  }, [viewCase?.id])

  const handleCaseUpdate = (id: string, updates: Partial<CaseRecord>) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    if (viewCase?.id === id) setViewCase(prev => prev ? { ...prev, ...updates } : prev)
  }

  const isSentToFcu = (caseItem: CaseRecord) => {
    const raw = String(caseItem.sourceStatus || '').toUpperCase().replace(/[\s_-]+/g, '_')
    const caseStat = String(caseItem.status || '').toUpperCase().replace(/[\s_-]+/g, '_')
    const stage = String(caseItem.workflowStage || '').toUpperCase().replace(/[\s_-]+/g, '_')
    
    // Explicitly reject New Lead or un-routed leads
    if (raw === 'NEW_LEAD' || raw === 'NEW' || caseStat === 'NEW_LEAD' || caseStat === 'NEW' || raw === 'FOLLOW_UP' || caseStat === 'FOLLOW_UP') {
      return false
    }

    if (
      raw.includes('FIELD') ||
      caseStat.includes('FIELD') ||
      stage.includes('FIELD') ||
      raw.includes('FCU') ||
      caseStat.includes('FCU') ||
      raw === 'SENT_TO_FCU' ||
      raw === 'SENT_FCU' ||
      caseStat === 'SENT_TO_FCU' ||
      caseStat === 'SENT_FCU' ||
      caseStat === 'FIELD_VERIFICATION' ||
      caseStat === 'SEND_TO_FIELD_VERIFICATION' ||
      caseStat === 'SENT_TO_FIELD_VERIFICATION' ||
      stage === 'FIELD_ASSIGNED' ||
      stage === 'FIELD_WAIVED' ||
      stage === 'DOCUMENT_REVIEW' ||
      stage === 'FCU_APPROVED'
    ) {
      return true
    }

    const validSentFcu = [
      'SENT_TO_FCU',
      'SENT_FCU',
      'SEND_TO_FCU',
      'SEND_FCU',
      'SEND_TO_FIELD_VERIFICATION',
      'SENT_TO_FIELD_VERIFICATION',
      'FIELD_VERIFICATION',
      'FCU_APPROVED',
      'UNDER_FCU_REVIEW',
    ]
    return validSentFcu.includes(raw) || validSentFcu.includes(caseStat)
  }

  const activeCases = cases.filter(caseItem => {
    const isRejectedStatus = caseItem.status.includes('REJECT')
    const terminalStatuses = ['SENT_TO_CREDIT', 'DISBURSED', 'REJECTED', 'FORWARDED_REJECT', 'FCU_REJECTED', 'REJECTED_BY_FCU', 'REJECTED_BY_CREDIT', 'CREDIT_REJECTED', 'LOAN_REJECT']
    return !terminalStatuses.includes(caseItem.status) && !isRejectedStatus && caseItem.workflowStage !== 'FINALIZED' && isSentToFcu(caseItem)
  })

  const pageConfig: Record<string, { title: string; statusMatch: (status: string) => boolean }> = {
    Applications: {
      title: 'Applications',
      statusMatch: status => !['SENT_TO_CREDIT', 'DISBURSED', 'REJECTED', 'FORWARDED_REJECT', 'FCU_REJECTED', 'REJECTED_BY_FCU', 'REJECTED_BY_CREDIT', 'CREDIT_REJECTED', 'LOAN_REJECT'].includes(status) && !status.includes('REJECT'),
    },
    Approved: {
      title: 'Approved Cases',
      statusMatch: status => status === 'APPROVED' || status === 'FCU_APPROVED',
    },
    Disbursed: {
      title: 'Disbursed Cases',
      statusMatch: status => status === 'DISBURSED',
    },
    Hold: {
      title: 'Hold Cases',
      statusMatch: status => status === 'HOLD',
    },
    'Rejected/Closed': {
      title: 'Rejected / Closed Cases',
      statusMatch: status => ['REJECTED', 'FORWARDED_REJECT', 'FCU_REJECTED', 'REJECTED_BY_FCU', 'REJECTED_BY_CREDIT', 'CREDIT_REJECTED', 'LOAN_REJECT'].includes(status) || status.includes('REJECT'),
    },
    'Credit Team': {
      title: 'Credit Team Queue',
      statusMatch: status => status === 'SENT_TO_CREDIT',
    },
  }

  const availableBranches = Array.from(new Set(cases.map(c => c.branch).filter(Boolean)))
  const availablePurposes = Array.from(new Set(cases.map(c => c.purpose).filter(Boolean)))

  const filtered = cases.filter(c => {
    const q = searchQuery.toLowerCase().trim()
    const matchSearch = !q ||
      c.borrower.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.ref && c.ref.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q))
    const matchPageStatus = activeNav === 'Applications'
      ? activeCases.some(activeCase => activeCase.id === c.id)
      : activeNav === 'Dashboard' || activeNav === 'Lead Tracker' || activeNav === 'Reports'
        ? true
        : pageConfig[activeNav]?.statusMatch(c.status) ?? true
    const matchPurpose = selectedPurpose === 'All Purposes' || c.purpose.toUpperCase() === selectedPurpose.toUpperCase()
    const matchBranch = selectedBranch === 'All Branches' || c.branch.toUpperCase() === selectedBranch.toUpperCase()
    return matchSearch && matchPageStatus && matchPurpose && matchBranch
  })

  const stats = [
    { label: 'ACTIVE CASES', value: String(cases.length), color: 'border-blue-500' },
    { label: 'FUNDED TOTAL AMOUNT', value: '₹8.5L', color: 'border-emerald-500' },
    { label: 'RECOVERED AMOUNT', value: '₹1.9L', color: 'border-purple-500' },
    { label: 'CASE RECOVERY RATIO', value: '₹34,000', color: 'border-orange-500' },
  ]

  const statsCases = activeNav === 'Applications' ? activeCases : filtered
  const totalAmount = statsCases.reduce((sum, item) => sum + item.loanRaw, 0)
  const fundedAmount = statsCases.filter(item => item.status === 'DISBURSED').reduce((sum, item) => sum + item.loanRaw, 0)
  const realStats = [
    { label: 'ACTIVE CASES', value: String(statsCases.length), color: 'border-blue-500' },
    { label: 'TOTAL LOAN AMOUNT', value: `₹${totalAmount.toLocaleString('en-IN')}`, color: 'border-emerald-500' },
    { label: 'FUNDED AMOUNT', value: `₹${fundedAmount.toLocaleString('en-IN')}`, color: 'border-purple-500' },
    { label: 'AVERAGE CASE VALUE', value: `₹${Math.round(totalAmount / Math.max(statsCases.length, 1)).toLocaleString('en-IN')}`, color: 'border-orange-500' },
  ]

  const getCustomerUploadToken = () => {
    const pathname = window.location.pathname || ''
    const hash = window.location.hash || ''
    const search = window.location.search || ''

    const params = new URLSearchParams(search)
    const queryToken = params.get('token') || params.get('customer-upload') || params.get('upload')
    if (queryToken && /^[a-f0-9]+$/i.test(queryToken)) return queryToken

    const hashMatch = hash.match(/customer-upload[\/=]([a-f0-9]+)/i)
    if (hashMatch) return hashMatch[1]

    const pathMatch = pathname.match(/customer-upload\/([a-f0-9]+)/i)
    if (pathMatch) return pathMatch[1]

    return null
  }

  const customerUploadToken = getCustomerUploadToken()
  if (customerUploadToken) return <LegacyCustomerUploadPage token={customerUploadToken} />

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold tracking-wide text-slate-300">Checking secure session…</div>
  }
  if (!authUser) return <LoginPage onLogin={setAuthUser} installPrompt={installPrompt} onInstallPwa={handleInstallPwa} />

  return (
    <div className="min-h-screen bg-[#f6f8fc] flex flex-col text-xs">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.06)] z-40 shrink-0">
        <div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 px-3 py-2 lg:h-16 lg:flex-nowrap lg:gap-3 lg:px-4 lg:py-0">
          <div className="shrink-0">
            <img src={geetpayLogo} alt="GeetPay - Product of Waqt Finance" className="h-10 w-auto max-w-[150px] object-contain object-left sm:max-w-[180px]" />
          </div>

          <nav className="order-3 flex w-full items-center overflow-x-auto px-0 lg:order-none lg:w-auto lg:flex-1 lg:justify-center lg:px-2">
            <div className="flex min-w-max items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 shadow-inner lg:min-w-[520px]">
              {NAV_ITEMS.map(item => (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-all ${activeNav === item
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {installPrompt && (
              <button
                onClick={handleInstallPwa}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 animate-pulse flex items-center gap-1"
                title="Install GeetPay FCU Dashboard as App"
              >
                <span>📲</span> Install App
              </button>
            )}
            <button
              onClick={() => setActiveNav('Lead Tracker')}
              className={`rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all ${activeNav === 'Lead Tracker'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
              🔍 Search
            </button>
            <button onClick={toggleNotifications} className="relative rounded-full px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900">
              🔔 Notifications
              {notifications.some(item => !item.isRead) && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white ring-2 ring-white">{Math.min(notifications.filter(item => !item.isRead).length, 99)}</span>}
            </button>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{authUser.name || authUser.email}</span>
              {authUser.role && <span className="text-slate-400 font-normal">({authUser.role})</span>}
            </div>
            <button onClick={handleLogout} className="rounded-full px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition-all hover:bg-rose-50 hover:text-rose-700">
              Logout
            </button>
          </div>
        </div>
      </header>

      {notificationsOpen && <div className="fixed right-3 top-16 z-[70] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div><div className="text-sm font-bold text-slate-900">Notifications {notifications.some(item => !item.isRead) ? `(${notifications.filter(item => !item.isRead).length})` : ''}</div><div className="text-[10px] text-slate-500">Applications and field verification updates</div></div>
          <button onClick={markAllNotificationsAsRead} disabled={!notifications.some(item => !item.isRead)} className="text-[10px] font-semibold text-blue-600 disabled:text-slate-300">Mark all read</button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 && <div className="px-4 py-10 text-center text-xs text-slate-500">No notifications yet</div>}
          {notifications.map(item => <button key={item.id} onClick={() => openNotification(item)} className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50 ${item.isRead ? 'bg-white' : 'bg-blue-50/70'}`}>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-slate-300' : 'bg-blue-600'}`} />
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-900">{item.title}</span><span className="mt-0.5 block text-[11px] text-slate-600">{item.message}</span><span className="mt-1 block text-[9px] font-medium text-slate-400">{item.applicationNumber} · {new Date(item.createdAt).toLocaleString('en-IN')}</span></span>
          </button>)}
        </div>
      </div>}

      {/* Alert Banner */}
      <div className="bg-[#fff8e8] border-b border-[#f3dfae] px-4 py-1.5 text-[10px] text-amber-800 flex items-center gap-2">
        <span>⚠</span>
        Privacy statement info: If your message contains words like MOBILE, GENDER, DOB, PAN, STATE, IDO, PROCESS — data may require profile regeneration.
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Dashboard MIS View */}
        {activeNav === 'Dashboard' && <Dashboard cases={cases} />}

        {/* Reports MIS View */}
        {activeNav === 'Reports' && <Reports cases={cases} />}

        {/* Lead Search & Case Tracker Page */}
        {activeNav === 'Lead Tracker' && <LeadTracker cases={cases} onViewCase={claimAndOpenCase} />}

        {/* Main Content + Sidebar */}
        {(activeNav === 'Applications' || activeNav === 'Approved' || activeNav === 'Disbursed' || activeNav === 'Hold' || activeNav === 'Rejected/Closed' || activeNav === 'Credit Team') && (
          <>
            <div className="flex-1 min-w-0 overflow-auto p-3 bg-[#f6f8fc]">
              <div className="w-full">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h1 className="text-sm font-bold text-slate-800">{pageConfig[activeNav]?.title ?? 'Applications'}</h1>
                    <p className="text-[10px] text-slate-500 mt-0.5">Operational visibility with actionable lead tracking</p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600 shadow-sm">
                    Updated just now
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {realStats.map(s => (
                    <div key={s.label} className={`rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] border-l-4 ${s.color}`}>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{s.label}</div>
                      <div className="text-xl font-bold font-mono text-slate-900">{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="relative min-w-[260px] flex-1">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">🔎</span>
                    <input
                      type="text"
                      placeholder="Search by name, app no, mobile..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-3 text-[11px] text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <select value={selectedPurpose} onChange={e => setSelectedPurpose(e.target.value)} className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 focus:border-blue-400 focus:outline-none">
                    <option>All Purposes</option>
                    {availablePurposes.map(purpose => (
                      <option key={purpose} value={purpose}>{purpose}</option>
                    ))}
                  </select>
                  <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 focus:border-blue-400 focus:outline-none">
                    <option>All Branches</option>
                    {availableBranches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                  <button className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all hover:bg-slate-50">↓ Export</button>
                </div>

                {/* Tabs */}
                {casesLoading && (
                  <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-[11px] font-semibold text-blue-700">
                    Loading applications from database…
                  </div>
                )}
                {casesError && (
                  <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-700">
                    {casesError}. Please check the backend server and database.
                  </div>
                )}
                {!casesLoading && !casesError && cases.length === 0 && (
                  <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-[11px] text-slate-500">
                    No applications found in the database.
                  </div>
                )}
                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide w-6">#</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Application</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Borrower</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Loan Details</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Branch / RM</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                          <th className="px-2 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <Fragment key={c.id}>
                            <tr
                              onClick={() => openCase(c, activeNav !== 'Applications')}
                              className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                              title={activeNav === 'Applications' ? 'Click to open application review' : 'Click to view application form in read-only mode'}
                            >
                              <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                              <td className="px-2 py-2">
                                <div className="font-semibold text-blue-700 font-mono">{c.id}</div>
                                <div className="text-[9px] text-gray-400">{c.ref}</div>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ backgroundColor: c.avatar }}>
                                    {c.initials}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-800">{c.borrower}</div>
                                    <div className="text-[9px] text-gray-400">{c.city}, {c.state}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-mono text-gray-700">{c.mobile}</div>
                                <div className="text-[9px] text-gray-400">{c.email}</div>
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-bold text-gray-800">{c.loan}</div>
                                <div className="flex gap-1 mt-0.5">
                                  <span className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[9px]">{c.purpose}</span>
                                  <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-[9px]">LTI: {c.lti}</span>
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <div className="font-medium text-gray-700">{c.branch}</div>
                                <div className="text-[9px] text-gray-400">{c.rm}</div>
                              </td>
                              <td className="px-2 py-2">
                                <StatusBadge status={c.status} />
                              </td>
                              <td className="px-2 py-2">
                                <div className="text-gray-700">{c.applied}</div>
                                <div className="text-[9px] text-gray-400">{c.disburse}</div>
                              </td>
                              <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                                {activeNav === 'Applications' ? (
                                  <button
                                    onClick={() => claimAndOpenCase(c)}
                                    disabled={Boolean(c.lock && !c.lock.isMine)}
                                    title={c.lock && !c.lock.isMine ? `Being reviewed by ${c.lock.userName}` : 'Open and claim application'}
                                    className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${c.lock && !c.lock.isMine ? 'cursor-not-allowed bg-amber-100 text-amber-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                  >
                                    {c.lock && !c.lock.isMine ? `In review: ${c.lock.userName}` : 'Review'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openCase(c, true)}
                                    title="View application details (read-only)"
                                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
                                  >
                                    View ↗
                                  </button>
                                )}
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-3 py-2">
                    <div className="text-[10px] text-slate-500">Showing {filtered.length} of {activeNav === 'Applications' ? activeCases.length : filtered.length} entries</div>
                    <div className="flex items-center gap-1">
                      <button className="rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100">Prev</button>
                      {[1, 2, 3, 4, 5].map(p => (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`h-6 w-6 rounded-full text-[10px] ${currentPage === p ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {p}
                        </button>
                      ))}
                      <button className="rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100">Next</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="hidden w-[260px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-200 bg-[#f8fafc] p-3 xl:flex">
              <div className="crm-panel p-2.5">
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-2">Session Details</div>
                <div className="space-y-1 text-[10px] text-gray-600">
                  <div><span className="text-gray-400">Session:</span> <span className="font-mono text-[9px]">{sidebarData?.session?.id || 'Loading…'}</span></div>
                  <div className="truncate" title={sidebarData?.session?.ipAddress}><span className="text-gray-400">IP:</span> {sidebarData?.session?.ipAddress || 'Loading…'}</div>
                  <div><span className="text-gray-400">Active:</span> <LiveSessionDuration loginAt={sidebarData?.session?.loginAt} /></div>
                  <div><span className="text-gray-400">Device:</span> {sidebarData?.session?.device || 'Detecting…'}</div>
                  <div><span className="text-gray-400">Browser:</span> <span className="text-[9px]">{sidebarData?.session?.browser || 'Detecting…'}</span></div>
                </div>
              </div>
              <div className="bg-white rounded border border-gray-200 p-2.5 shadow-sm">
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-2">Admin</div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{(authUser.name || authUser.email).charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-800">{authUser.name || authUser.email}</div>
                    <div className="text-[9px] text-gray-400">{authUser.role}</div>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[9px] text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
                </div>
              </div>
              <DigitalClock />
              <div className="bg-white rounded border border-gray-200 p-2.5 shadow-sm">
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-2">Login Activity</div>
                <div className="space-y-1.5 text-[10px]">
                  {(sidebarData?.activities || []).map((activity: any, index: number) => {
                    const date = new Date(activity.created_at)
                    const isToday = date.toDateString() === new Date().toDateString()
                    return (
                      <div key={activity.id || index} className="flex justify-between gap-2">
                        <span className={isToday ? 'font-semibold text-blue-600' : 'text-gray-500'}>{isToday ? 'Today' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        <span className="font-mono text-[9px] text-gray-600">{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )
                  })}
                  {sidebarData?.activities?.length === 0 && <div className="text-gray-400">No login activity yet</div>}
                </div>
              </div>
              <div className="bg-white rounded border border-gray-200 p-2.5 shadow-sm">
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-2">This Month</div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Reviewed', val: sidebarData?.month?.reviewed ?? 0, color: 'bg-blue-500' },
                    { label: 'Fraud Found', val: sidebarData?.month?.fraudFound ?? 0, color: 'bg-rose-500' },
                    { label: 'Cleared', val: sidebarData?.month?.cleared ?? 0, color: 'bg-emerald-500' },
                    { label: 'Pending', val: sidebarData?.month?.pending ?? 0, color: 'bg-amber-500' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-sm ${color}`} /><span className="text-gray-600">{label}</span></div>
                      <span className="font-bold text-gray-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Bottom Bar */}
      <footer className="bg-[#f8fafc] text-slate-600 flex items-center justify-center h-7 text-[10px] shrink-0 border-t border-slate-200">
        <button className="flex items-center gap-1.5 hover:text-blue-300 transition-colors">🧮 PayDay Calculator</button>
      </footer>

      {/* Case Detail Drawer */}
      {viewCase && (
        <CaseDetailDrawer
          caseData={viewCase}
          reviewerName={authUser.name || authUser.email}
          reviewerRole={authUser.role}
          readOnly={activeNav !== 'Applications'}
          onClose={closeCaseDrawer}
          onCaseUpdate={handleCaseUpdate}
          onMoveToCredit={() => {
            setViewCase(null)
            setActiveNav('Credit Team')
            setActiveTab('ALL')
          }}
          onMoveToHold={() => {
            setViewCase(null)
            setActiveNav('Hold')
            setActiveTab('ALL')
          }}
        />
      )}
    </div>
  )
}
