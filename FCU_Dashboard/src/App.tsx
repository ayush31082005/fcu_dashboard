import { useState, useEffect, Fragment, useRef } from 'react'
import Dashboard from './Dashboard'
import LeadTracker from './LeadTracker'
import Reports from './Reports'
import LoginPage, { API_BASE_URL, type FcuUser } from './LoginPage'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DISBURSED:        { label: 'Disbursed',        bg: 'bg-slate-100', text: 'text-slate-800', dot: 'bg-slate-700' },
  DOCUMENT_PENDING: { label: 'Document Pending', bg: 'bg-zinc-100',  text: 'text-zinc-800', dot: 'bg-zinc-600' },
  REJECTED:         { label: 'Rejected',          bg: 'bg-stone-100', text: 'text-stone-800', dot: 'bg-stone-700' },
  PENDING:          { label: 'Pending',           bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  APPROVED:         { label: 'Approved',          bg: 'bg-zinc-100',  text: 'text-zinc-900', dot: 'bg-zinc-700' },
  UNDER_REVIEW:     { label: 'Under Review',      bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
  FRAUD_FLAGGED:    { label: 'Fraud Flagged',     bg: 'bg-zinc-100',  text: 'text-zinc-900', dot: 'bg-zinc-700' },
  SENT_TO_CREDIT:   { label: 'Sent to Credit',    bg: 'bg-zinc-100',  text: 'text-zinc-900', dot: 'bg-zinc-700' },
  FORWARDED_REJECT: { label: 'Forwarded Reject',  bg: 'bg-stone-100', text: 'text-stone-800', dot: 'bg-stone-700' },
  FIELD_VERIFICATION: { label: 'Field Verification', bg: 'bg-slate-100', text: 'text-slate-800', dot: 'bg-slate-700' },
  HOLD:             { label: 'Hold',              bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
}

type DocStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type CheckStatus = 'PASS' | 'FAIL' | 'PENDING'

interface RequestedDocument { id: number; documentName: string; status: string; fileName?: string; filePath?: string; uploadedAt?: string }
interface DocumentRequestData { id: number; application_id?: number; token: string; status: string; expires_at: string; documents: RequestedDocument[]; shareUrl?: string; leadId?: string; customerName?: string }
interface FcuNotification { id: string; type: 'NEW_APPLICATION' | 'FIELD_REPORT_SUBMITTED'; applicationId: number; applicationNumber: string; title: string; message: string; borrower: string; createdAt: string; isRead: boolean }

interface CaseDoc {
  id: string
  name: string
  type: string
  uploaded: string
  status: DocStatus
  fileUrl?: string | null
  fileName?: string
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
  { id: 'APP0000112', ref: 'LN-CRP-8726372', borrower: 'Manoj Tiwari', initials: 'MT', avatar: '#3b82f6', mobile: '9437539871', email: 'manoji@gmail.com', loan: '₹40,000', loanRaw: 40000, purpose: 'HOME REPAIR', lti: '55%', branch: 'PANROSE DELHI', rm: 'RK GOBIND MISHRA', website: 'APP', status: 'DISBURSED', applied: '16 Jul 2025', disburse: '21 Jul 2025', flags: [], dob: '12 Mar 1990', gender: 'Male', pan: 'ABCPM1234D', aadhar: 'XXXX-XXXX-4321', address: '12, MG Road, Karol Bagh', city: 'Delhi', state: 'Delhi', pincode: '110005', employer: 'HDFC Bank Ltd', income: '₹35,000/mo', tenure: '18 months', cibil: '742', alternateMobile: '9876543210', emailOffice: 'manoj@hdfcbank.com', screenedBy: 'Chandrani Poswani', screenedOn: '09-06-2020 15:30:08', firstName: 'Manoj', middleName: 'Kumar', surname: 'Tiwari', residenceType: 'OWNED', residenceAddressLine1: '12, MG Road', residenceAddressLine2: 'Karol Bagh', serviceLine: 'Personal Loan', owner: 'RK GOBIND MISHRA', docs: buildDocs('DISBURSED'), checks: buildChecks('DISBURSED'), remarks: ['Application verified by FCU team.'], references: [
    { srNo: 1, name: 'Sleena Pam Barua', relation: 'Brother', mobile: '9198851030', loanLeadId: 'APP000000099' },
    { srNo: 2, name: 'Rina Pam Barua', relation: 'Parents', mobile: '9198552745', loanLeadId: 'LEAD6379' },
  ] },
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
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
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
  onClose,
  onCaseUpdate,
  onMoveToCredit,
  onMoveToHold,
}: {
  caseData: CaseRecord
  reviewerName: string
  onClose: () => void
  onCaseUpdate: (id: string, updates: Partial<CaseRecord>) => void
  onMoveToCredit: () => void
  onMoveToHold: () => void
}) {
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
  const documentOptions = ['Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving License', 'Utility Bill (Electricity/Water/Gas)', 'Bank Statement']
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
  const ekyc = caseData.ekycDetails
  const ekycAssetUrl = (filePath?: string | null) => filePath
    ? (/^(https?:|data:|blob:)/i.test(filePath) ? filePath : `${API_BASE_URL}/${filePath.replace(/^\/+/, '')}`)
    : ''
  const [fieldReport, setFieldReport] = useState<FieldReport | null>(caseData.fieldReport || null)
  const reportAssetUrl = (filePath?: string) => filePath
    ? (/^(https?:|data:|blob:)/i.test(filePath) ? filePath : `${API_BASE_URL}/${filePath.replace(/^\/+/, '')}`)
    : ''
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

  const loadDocumentRequest = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests`, { credentials: 'include', cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        setDocumentRequest(result.data || null)
        const pending = (result.data?.documents || []).find((item: RequestedDocument) => item.status === 'PENDING')
        setUploadDocumentId(pending?.id || null)
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
    if (activeTab !== 'history') return
    void loadCaseHistory()
  }, [activeTab, caseData.id])

  const createShareLink = async () => {
    if (!selectedRequestDocs.length) { showToast('Select at least one document', 'error'); return }
    try {
      setRequestSaving(true)
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/document-requests`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documents: selectedRequestDocs }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to create share link')
      const data = { ...result.data, shareUrl: `${window.location.origin}/customer-upload/${result.data.token}` }
      setDocumentRequest(data)
      setUploadDocumentId(data.documents?.[0]?.id || null)
      showToast('Customer document request created', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create request'
      showToast(message, 'error')
      if (message.toLowerCase().includes('removed from the database') || message.toLowerCase().includes('no longer exists')) {
        window.setTimeout(onClose, 1800)
      }
    }
    finally { setRequestSaving(false) }
  }

  const shareUrl = documentRequest?.token ? `${window.location.origin}/customer-upload/${documentRequest.token}` : ''
  const copyShareLink = async () => {
    if (!shareUrl) { showToast('Create a share link first', 'error'); return }
    await navigator.clipboard.writeText(shareUrl)
    showToast('Share link copied', 'success')
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
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/bank-penny-verification`, {
        method: 'POST', credentials: 'include',
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
        accountNumber: verification.account_number ? String(verification.account_number).replace(/\s/g, '') : caseData.ekycDetails?.bank?.accountNumber || 'N/A',
        ifscCode: verification.ifsc_code || 'N/A',
        message: apiData.message || 'N/A', status: 'Verified',
        providerData: apiData.provider_data || {},
      }
      onCaseUpdate(caseData.id, { ekycDetails: { ...caseData.ekycDetails!, bankPenny } })
      showToast('Bank account verified and saved', 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to verify bank account', 'error') }
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
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/corporate-email-verification`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Unable to verify corporate email')
      const verification = result.data || null
      setCorporateEmailVerification(verification)
      onCaseUpdate(caseData.id, { corporateEmailVerification: verification })
      showToast(verification?.isVerified ? 'Corporate email verified' : 'Corporate email is not verified', verification?.isVerified ? 'success' : 'error')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to verify corporate email', 'error')
    } finally { setCorporateEmailSaving(false) }
  }
  const uploadRequestedFile = async () => {
    if (!documentRequest?.token || !uploadDocumentId || !uploadFile) { showToast('Choose a pending document and file', 'error'); return }
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
      showToast('Document uploaded by customer', 'success')
    } catch (error) { showToast(error instanceof Error ? error.message : 'Unable to upload', 'error') }
    finally { setRequestSaving(false) }
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const updateDocStatus = async (docId: string, status: DocStatus, reason = '') => {
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
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseData.databaseId || caseData.id}/ekyc/${checkId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify({status}) })
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
      const newRemarks = [...remarks, `[${new Date().toLocaleTimeString()}] System: Case ${action} by FCU Officer Rahul Sharma`]
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
  const docsPending  = docs.filter(d => d.status === 'PENDING').length
  const allDocsApproved = docs.length > 0 && docs.every(d => d.status === 'APPROVED')
  const allEkycChecksPassed = checks.length > 0 && checks.every(check => check.status === 'PASS')
  const allRequestedDocumentsUploaded = Boolean(documentRequest?.documents?.length)
    && documentRequest?.status === 'COMPLETED'
    && documentRequest.documents.every(document => document.status !== 'PENDING')
  const canInitialDecision = workflowStage === 'DOCUMENT_REVIEW' && allRequestedDocumentsUploaded && allDocsApproved && allEkycChecksPassed
  const canChooseVerification = workflowStage === 'FCU_APPROVED'
  const fieldReportComplete = Boolean(fieldReport)
    && reportSubmissionSummary.length > 0
    && reportSubmissionSummary.every(item => item.done)
  const canFinalDecision = workflowStage === 'FIELD_WAIVED'
    || (workflowStage === 'FIELD_ASSIGNED' && fieldReportComplete)
  const documentActionsLocked = workflowStage !== 'DOCUMENT_REVIEW'
  const checksPass   = checks.filter(c => c.status === 'PASS').length
  const checksFail   = checks.filter(c => c.status === 'FAIL').length
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
    { key: 'loan',     label: 'Application' },
    { key: 'docs',     label: `Documents (${docsApproved}/${docs.length})` },
    { key: 'personal', label: 'Personal' },
    { key: 'aadhaar',  label: 'Aadhaar' },
    { key: 'fcu',      label: `eKYC` },
    { key: 'credit',   label: 'Credit Bureau' },
    { key: 'field',    label: 'Field Details' },
    { key: 'history',  label: `History (${history.length})` },
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
            <button onClick={onClose} className="px-2.5 py-1 rounded bg-white/10 text-blue-100 hover:bg-white/20 text-[11px] font-medium">
              ← Back to Applications
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
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Customer Snapshot</div>
                  <div className="text-xl font-semibold text-gray-800">Schedule callback and verify commitment</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">Ready for follow-up</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Priority</div>
                  <div className="mt-1 text-[14px] font-semibold text-gray-800">High</div>
                </div>
                
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">Channel</div>
                  <div className="mt-1 text-[14px] font-semibold text-gray-800">Website</div>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[10px] font-semibold uppercase text-gray-500">City</div>
                  <div className="mt-1 text-[14px] font-semibold text-gray-800">{caseData.city}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Case Progress</div>
                <div className="text-[11px] text-gray-500">Follow-up / Conversion</div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: 'Application Submitted', active: true },
                    { label: 'Documents Received', active: true },
                    { label: 'Qualification', active: true },
                    { label: 'Follow-up / Conversion', active: true },
                    { label: 'Verification in Progress', active: true },
                    { label: 'Credit Assessment', active: false },
                    { label: 'Under Review / Underwriting', active: false },
                    { label: 'Approved / Sanctioned', active: false },
                    { label: 'Agreement Signing', active: false },
                    { label: 'Disbursement in Process', active: false },
                    { label: 'Disbursed', active: false },
                  ].map((step, index) => (
                    <div key={`${step.label}-${index}`} className="space-y-1.5">
                      <div className={`h-1.5 rounded-full ${step.active ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                      <div className={`text-[10px] ${step.active ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>{step.label}</div>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-emerald-700 font-semibold">
                  Verify KYC and schedule the next call based on the current lead stage.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase text-gray-500">Lead Stage</div>
              <div className="mt-1 text-[14px] font-semibold text-gray-800">Follow Up</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase text-gray-500">Follow-up Mode</div>
              <div className="mt-1 text-[14px] font-semibold text-gray-800">Standard</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase text-gray-500">Service Line</div>
              <div className="mt-1 text-[14px] font-semibold text-gray-800">Personal Loan</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="text-[10px] font-semibold uppercase text-gray-500">Owner</div>
              <div className="mt-1 text-[14px] font-semibold text-gray-800">Rakesh RM</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex max-w-full overflow-x-auto border-b border-slate-200 bg-white shrink-0 px-2 pt-2">
          {tabDefs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-all rounded-t-lg border-b-2 ${
                activeTab === t.key
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
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Screened By (FCU)</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{reviewerName || caseData.screenedBy || 'N/A'}</div></div>
                  <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Screened On</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.screenedOn || 'N/A'}</div></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Residence ({caseData.residenceType || 'Owned'})</div>
                      <div className="text-[11px] text-gray-500">Residential verification details</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">3 fields</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3 col-span-2"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 1</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.residenceAddressLine1 || caseData.address}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 2</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.residenceAddressLine2 || caseData.city}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">City</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.city}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">State</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.state}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Pincode</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.pincode}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Residence Type</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.residenceType || 'Owned'}</div></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Residence ({caseData.secondaryResidenceType || 'Secondary'})</div>
                      <div className="text-[11px] text-gray-500">Secondary residency evidence</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">3 fields</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-y divide-gray-200">
                    <div className="p-3 col-span-2"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 1</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceAddressLine1 || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Address Line 2</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceAddressLine2 || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">City</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceCity || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">State</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceState || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Pincode</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidencePincode || 'N/A'}</div></div>
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Residence Type</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.secondaryResidenceType || 'N/A'}</div></div>
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
                        {corporateEmailVerification?.reason && (
                          <div className={`mt-1 text-[10px] font-medium ${corporateEmailVerification.isVerified ? 'text-emerald-700' : 'text-red-600'}`}>
                            {corporateEmailVerification.reason}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:ml-2">
                        {corporateEmailVerification && (
                          <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${corporateEmailVerification.isVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                            {corporateEmailVerification.isVerified ? '✓ Verified' : '✕ Not Verified'}
                          </span>
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
                    <div className="p-3"><div className="text-[10px] font-semibold uppercase text-gray-500">Title</div><div className="mt-1 text-[13px] font-semibold text-gray-800">{caseData.title || 'MR'}</div></div>
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
                        <div className="mt-1 text-2xl font-bold text-blue-600">{documentRequest?.status === 'ACTIVE' ? 1 : 0}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-gray-700 mb-2">Select required loan document(s)</div>
                      <div className="space-y-2">
                        {documentOptions.map(doc => (
                          <label key={doc} className="flex items-center gap-2 text-[11px] text-gray-700">
                            <input type="checkbox" checked={selectedRequestDocs.includes(doc)} onChange={() => setSelectedRequestDocs(current => current.includes(doc) ? current.filter(item => item !== doc) : [...current, doc])} className="h-3.5 w-3.5 accent-blue-600" />
                            <span>{doc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={createShareLink} disabled={requestSaving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50">{requestSaving ? 'Saving…' : 'Create share link'}</button>
                      <button onClick={shareDocumentLink} className="px-4 py-2 bg-slate-700 text-white rounded text-[11px] font-semibold hover:bg-slate-800">Share</button>
                      <button onClick={copyShareLink} className="px-4 py-2 bg-slate-100 text-gray-700 rounded text-[11px] font-semibold border border-gray-200 hover:bg-slate-200">Copy</button>
                    </div>
                    <div className="rounded border border-gray-200 bg-[#f8fafc] p-3">
                      <div className="text-[11px] font-semibold text-gray-700">Share link</div>
                      <div className="mt-1 break-all text-[11px] text-gray-600">{shareUrl || 'No active share link'}</div>
                      <div className="mt-2 text-[10px] text-gray-500">Requested docs: {documentRequest?.documents?.map(doc => doc.documentName).join(', ') || 'None'}</div>
                      <div className="text-[10px] text-gray-500">Current state: {documentRequest?.status || 'NOT CREATED'}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f4fa] border-b border-gray-200">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#1e3a5f]">Customer upload portal</div>
                      <div className="text-[11px] text-gray-500">Monitor customer upload activity and document movement</div>
                    </div>
                    <button onClick={() => shareUrl && window.open(shareUrl, '_blank')} className="px-3 py-1 rounded border border-gray-200 bg-white text-[10px] font-semibold text-gray-600">Portal</button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="rounded border border-gray-200 bg-[#f7f9fc] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600">{documentRequest ? `${documentRequest.documents.filter(doc => doc.status === 'UPLOADED').length}/${documentRequest.documents.length} uploaded` : 'No active request'}</div>
                    <div className="rounded border border-gray-200 bg-white p-4 text-[11px] text-gray-700">
                      Customer document upload status
                      <div className="mt-1 text-[10px] text-gray-500">Share this link to the customer and ask them to upload the requested document(s).</div>
                    </div>
                    {documentRequest?.documents?.length > 0 && documentRequest.documents.every(doc => doc.status !== 'PENDING') && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">✓</div>
                        <div className="text-[12px] font-bold text-emerald-800">All requested documents uploaded</div>
                        <div className="mt-1 text-[10px] text-emerald-700">The customer has completed this document request.</div>
                      </div>
                    )}
                    {(documentRequest?.documents || []).some(doc => doc.status !== 'PENDING') && (
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">Uploaded documents</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(documentRequest?.documents || []).filter(doc => doc.status !== 'PENDING').map(doc => {
                            const fileUrl = doc.filePath ? `${API_BASE_URL}/${doc.filePath.replace(/^\/+/, '')}` : ''
                            const isImage = /\.(jpe?g|png|webp)$/i.test(doc.filePath || doc.fileName || '')
                            return (
                              <a key={doc.id} href={fileUrl || undefined} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition hover:border-blue-300 hover:bg-blue-50">
                                <div className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white bg-white shadow-sm">
                                  {isImage && fileUrl ? <img src={fileUrl} alt={`${doc.documentName} uploaded preview`} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="text-center"><div className="text-lg font-black text-red-600">PDF</div><div className="text-[8px] text-slate-400">DOCUMENT</div></div>}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[11px] font-bold text-slate-800">{doc.documentName}</div>
                                  <div className="mt-0.5 truncate text-[9px] text-slate-500">{doc.fileName || 'Uploaded file'}</div>
                                  <div className="mt-1 flex items-center justify-between gap-2"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700">{doc.status}</span><span className="text-[9px] font-semibold text-blue-600">View ↗</span></div>
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <select value={uploadDocumentId || ''} onChange={event => setUploadDocumentId(Number(event.target.value))} className="w-full rounded border border-gray-200 bg-[#f7f9fc] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                      <option value="">Select pending document</option>
                      {(documentRequest?.documents || []).filter(doc => doc.status === 'PENDING').map(doc => <option key={doc.id} value={doc.id}>{doc.documentName} - {doc.status}</option>)}
                    </select>
                    <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={event => setUploadFile(event.target.files?.[0] || null)} className="w-full rounded border border-gray-200 bg-white p-3 text-[10px] text-gray-500" />
                    <button onClick={uploadRequestedFile} disabled={requestSaving || !uploadFile || !uploadDocumentId} className="w-full px-4 py-3 bg-slate-700 text-white rounded text-[11px] font-semibold hover:bg-slate-800 disabled:bg-slate-300">{requestSaving ? 'Uploading…' : 'Mark as uploaded by customer'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Documents ── */}
          {activeTab === 'docs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[11px] font-semibold text-gray-700">
                  {docsApproved} Approved · {docsPending} Pending · {docs.filter(d => d.status === 'REJECTED').length} Rejected
                </div>
                <button
                  onClick={approveAllDocuments}
                  disabled={documentActionsLocked || actionSaving}
                  className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Approve All
                </button>
              </div>
              {docs.map(doc => (
                <div key={doc.id} className={`flex items-center justify-between border rounded p-3 transition-colors ${
                  doc.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50/40' :
                  doc.status === 'REJECTED' ? 'border-red-200 bg-red-50/40' :
                  'border-amber-200 bg-amber-50/40'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
                      doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status === 'APPROVED' ? '✓' : doc.status === 'REJECTED' ? '✗' : '◷'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-[11px]">{doc.name}</div>
                      <div className="text-[9px] text-gray-500">{doc.type} · Uploaded {doc.uploaded}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{doc.status}</span>
                    <button
                      onClick={() => updateDocStatus(doc.id, 'APPROVED')}
                      disabled={documentActionsLocked || doc.status === 'APPROVED' || actionSaving}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setFraudSourceDocument(doc.name)
                        setDocumentRejectTarget(null)
                        setActionReason('')
                        setConfirmAction('Flag as Fraud')
                      }}
                      disabled={documentActionsLocked || actionSaving}
                      className="px-2.5 py-1 bg-rose-700 text-white rounded text-[10px] font-semibold hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Permanently flag this application as fraud"
                    >
                      ⚑ Flag
                    </button>
                    <button
                      onClick={() => {
                        setDocumentRejectTarget({ id: doc.id, name: doc.name })
                        setFraudSourceDocument(null)
                        setActionReason('')
                        setConfirmAction('Reject Document')
                      }}
                      disabled={documentActionsLocked || doc.status === 'REJECTED' || actionSaving}
                      className="px-2.5 py-1 bg-red-600 text-white rounded text-[10px] font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                    <button onClick={() => setPreviewDocument(doc)} className="px-2.5 py-1 border border-gray-200 text-gray-600 rounded text-[10px] hover:bg-gray-50">
                      View
                    </button>
                  </div>
                </div>
              ))}
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
                      {['SELF','FATHER','MOTHER','SPOUSE','SON','DAUGHTER','BROTHER','SISTER','GUARDIAN','OTHER'].map((relation) => <option key={relation} value={relation}>{relation.charAt(0) + relation.slice(1).toLowerCase()}</option>)}
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
              <EkycCard title="Bank account details" subtitle="Banking information from the customer profile" badge={String(ekyc?.bank?.verificationStatus || 'Not verified')} tone="green" fields={[
                ['Account Holder Name', ekyc?.bank?.accountHolderName], ['Bank Name', ekyc?.bank?.bankName],
                ['Account Number', ekyc?.bank?.accountNumber], ['IFSC Code', ekyc?.bank?.ifscCode],
                ['Branch Name', ekyc?.bank?.branchName], ['Account Type', ekyc?.bank?.accountType],
                ['Salary Account', ekyc?.bank?.salaryAccount],
              ]} />
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
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <EkycImageCard
                  title="Customer Live Selfie"
                  subtitle="Live selfie verification attached to dossier"
                  image={ekycAssetUrl(ekyc?.selfie)}
                  fallback="👤"
                  caption="Live selfie captured"
                  wide
                />
                <EkycImageCard
                  title="Matched Document Photo"
                  subtitle="Aadhaar ID photo matched against selfie"
                  image={ekycAssetUrl(ekyc?.aadhaar?.photo || ekyc?.fetchedAadhaar?.photo)}
                  fallback="🪪"
                  caption="Aadhaar record photo"
                  wide
                />
                <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)]">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                    <div>
                      <div className="text-[13px] font-bold text-slate-900">Face Match Analysis</div>
                      <div className="text-[10px] text-slate-500">Biometric comparison score</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                      (ekyc?.faceMatch?.percentage ?? 42) >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      (ekyc?.faceMatch?.percentage ?? 42) >= 50 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {ekyc?.faceMatch?.status || 'LOW'} MATCH
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between space-y-4 p-4">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 shadow-inner">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Match Similarity Score</span>
                        <div className="mt-0.5 font-mono text-3xl font-black text-slate-900">
                          {ekyc?.faceMatch?.percentage ?? 42}%
                        </div>
                        <p className="mt-1 text-[10px] font-medium text-slate-500">
                          Calculated via deep facial landmark vector alignment
                        </p>
                      </div>
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 font-mono text-sm font-black shadow-md ${
                        (ekyc?.faceMatch?.percentage ?? 42) >= 80 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                        (ekyc?.faceMatch?.percentage ?? 42) >= 50 ? 'border-amber-500 bg-amber-50 text-amber-700' :
                        'border-rose-500 bg-rose-50 text-rose-700'
                      }`}>
                        {ekyc?.faceMatch?.percentage ?? 42}%
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                        <div className="text-[9px] font-bold uppercase text-slate-400">Face Match Status</div>
                        <div className="mt-0.5 font-bold text-slate-800">{ekyc?.faceMatch?.status || 'LOW'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                        <div className="text-[9px] font-bold uppercase text-slate-400">Confidence Level</div>
                        <div className="mt-0.5 font-bold text-slate-800">{ekyc?.faceMatch?.confidence || 'Low'}</div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11px] text-slate-700">
                      <span className="mb-0.5 block font-bold text-blue-900">Verification Details:</span>
                      {ekyc?.faceMatch?.details || `Face feature alignment verified locally (${ekyc?.faceMatch?.percentage ?? 42}% similarity).`}
                    </div>
                  </div>
                </div>
              </div>
              <Section title="Field Verification Report">
                <Grid2>
                  <Field label="Verification Status" value={verificationReport.status} />
                  <Field label="Requested On" value={verificationReport.requestedOn} />
                  <Field label="Assigned Officer" value={verificationReport.assignedOfficer} />
                  <Field label="Visit Date" value={verificationReport.visitDate} />
                  <Field label="Result" value={verificationReport.result} span />
                  <Field label="Summary" value={verificationReport.summary} span />
                  <Field label="Next Action" value={verificationReport.nextAction} span />
                </Grid2>
              </Section>
              <div className="flex items-center gap-4 mb-1">
                <div className="text-[11px]"><span className="font-bold text-emerald-700">{checksPass}</span> <span className="text-gray-500">Pass</span></div>
                <div className="text-[11px]"><span className="font-bold text-red-600">{checksFail}</span> <span className="text-gray-500">Fail</span></div>
                <div className="text-[11px]"><span className="font-bold text-amber-600">{checks.filter(c => c.status === 'PENDING').length}</span> <span className="text-gray-500">Pending</span></div>
              </div>
              {checks.map(check => (
                <div key={check.id} className={`flex items-center justify-between border rounded p-3 ${
                  check.status === 'PASS' ? 'border-emerald-200 bg-emerald-50/30' :
                  check.status === 'FAIL' ? 'border-red-200 bg-red-50/30' :
                  'border-gray-200 bg-gray-50/60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      check.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
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
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                          check.status === s
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
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="sticky bottom-0 z-40 flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-200 bg-[#f8fafc]/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-5 xl:static xl:flex-nowrap xl:gap-3 xl:bg-[#f8fafc] xl:px-5 xl:py-3 xl:shadow-none">
          <div className="w-full min-w-[220px] text-[10px] text-gray-500 xl:w-auto xl:flex-1">
            Reviewing as: <span className="font-semibold text-gray-700">Rahul Sharma (FCU Manager)</span>
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
                  <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">{assetUrl && <a href={assetUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white">Open original ↗</a>}<button onClick={() => setPreviewDocument(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-[11px] font-semibold text-slate-600">Close</button></div>
                </div>
              </div>
            )
          })()}
          {confirmAction && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6">
              <button aria-label="Close confirmation" className="absolute inset-0 h-full w-full cursor-default" onClick={() => { setConfirmAction(null); setFraudSourceDocument(null); setDocumentRejectTarget(null); setActionReason('') }} />
              <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                <div className={`text-sm font-bold mb-2 ${
                  (confirmAction.includes('Reject') || confirmAction.includes('Fraud')) ? 'text-red-700' :
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
                    className={`w-full rounded-xl px-4 py-2.5 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:py-1.5 ${
                      (confirmAction.includes('Reject') || confirmAction.includes('Fraud')) ? 'bg-red-600 hover:bg-red-700' :
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
            <div className={`fixed bottom-6 right-6 z-70 px-4 py-2 rounded shadow-lg text-white text-[11px] font-semibold flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600' :
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
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">▤</span><div><h2 className="text-lg font-black text-slate-900">CIBIL Credit Score</h2><p className="text-xs text-slate-400">Bureau credit report powered by Bifrost API</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={() => window.location.reload()} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">↻ Silent Reload</button><span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">✓ {validScore ? 'Checked' : 'No score'}</span></div></div><div className="flex flex-col items-center px-5 py-8"><div className="text-sm font-black uppercase tracking-wider text-slate-800">Credit Score</div><div className="relative mt-5 h-40 w-72"><svg viewBox="0 0 240 135" className="h-full w-full"><path d="M25 115 A95 95 0 0 1 215 115" fill="none" stroke="#ef4444" strokeWidth="25" strokeLinecap="round"/><path d="M57 48 A95 95 0 0 1 101 23" fill="none" stroke="#f97316" strokeWidth="25"/><path d="M101 23 A95 95 0 0 1 151 29" fill="none" stroke="#eab308" strokeWidth="25"/><path d="M151 29 A95 95 0 0 1 195 70" fill="none" stroke="#84cc16" strokeWidth="25"/><path d="M195 70 A95 95 0 0 1 215 115" fill="none" stroke="#16a34a" strokeWidth="25" strokeLinecap="round"/>{validScore && <g transform={`rotate(${needleAngle} 120 115)`}><line x1="120" y1="115" x2="198" y2="115" stroke="#0f172a" strokeWidth="5"/><circle cx="120" cy="115" r="7" fill="#0f172a"/></g>}</svg><div className="absolute inset-x-0 bottom-1 text-center"><div className="text-5xl font-black" style={{ color: scoreColor }}>{validScore ? score : 'N/A'}</div><div className="text-[11px] font-black uppercase tracking-[.25em] text-slate-500">{validScore ? scoreCategory : 'No score'}</div></div></div><div className="mt-5 flex flex-wrap justify-center gap-3">{reportLink && <a href={reportLink} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700">◉ View PDF</a>}{reportUrl && <a href={reportUrl} download target="_blank" rel="noreferrer" className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white">⇩ Download Report</a>}</div></div></section>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric label="CIBIL Score" value={validScore ? score : 'N/A'} hint="TransUnion V3" color="#059669"/><Metric label="Total Accounts" value={totalAccounts} hint="Tradelines" color="#2563eb"/><Metric label="Active Accounts" value={activeAccounts} hint="Running Loans" color="#0d9488"/><Metric label="Closed Accounts" value={closedAccounts} hint="Settled / Closed" color="#9333ea"/><Metric label="On-time Payment" value={useful(field('on_time_payment'))} hint="Track Record" color="#047857"/><Metric label="Inquiries (Total)" value={inquiryTotal || 'N/A'} hint="Bureau Enquiries" color="#334155"/></div>
    <div className="grid items-start gap-4 lg:grid-cols-2"><section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="border-b border-slate-100 pb-4 text-base font-bold text-slate-900">✨ Score Factors & Interpretation</h3><div className="mt-4 rounded-2xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">Key Factors Affecting Score</div><p className="mt-2 text-sm leading-6 text-slate-700">{keyFactors}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="text-[10px] font-bold text-emerald-700">SCORE CATEGORY</div><div className="mt-1 text-base font-black text-emerald-700">{scoreCategory}</div></div><div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-[10px] font-bold text-blue-700">RISK ASSESSMENT</div><div className="mt-1 text-base font-black text-blue-700">{scoreInterpretation}</div></div></div></section><section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><h3 className="text-base font-bold text-slate-900">♢ DPD & Delinquency Analysis</h3><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{riskFlag}</span></div><div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="text-sm font-bold text-emerald-800">Delinquency Summary</div><p className="mt-2 text-sm leading-6 text-slate-700">{dpdAnalysis}</p></div></section></div>
    <div className="grid items-start gap-4 lg:grid-cols-2"><LoanList title="▭ Active Loans & Exposure" records={activeLoans} accent="#0d9488" empty="No active loans reported in bureau"/><LoanList title="✓ Closed & Settled Loans" records={closedLoans} accent="#9333ea" empty="No closed loan records found"/></div>
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
      setSavingId(documentId); setError('')
      const imageBase64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/customer-upload/${token}/documents/${documentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64, fileName: file.name }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Upload failed')
      setRequest(result.data)
    } catch (error) { setError(error instanceof Error ? error.message : 'Upload failed') }
    finally { setSavingId(null) }
  }
  return <div className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
    <div className="mb-5 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">G</div><div><h1 className="text-lg font-bold text-slate-900">GeetPay Document Upload</h1><p className="text-xs text-slate-500">Upload only the documents requested by our FCU team.</p></div></div>
    {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    {!request && !error && <div className="text-sm text-slate-500">Loading request…</div>}
    {request && <><div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
      <div><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">User name</span><strong className="mt-1 block text-sm text-slate-900">{request.customerName || 'Customer'}</strong></div>
      <div><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Lead ID</span><strong className="mt-1 block text-sm text-slate-900">{request.leadId || `APP${String(request.application_id || request.id).padStart(7, '0')}`}</strong></div>
      <div className="flex items-center justify-between border-t border-slate-200 pt-2 sm:col-span-2"><span>Status</span><strong>{request.status}</strong></div>
    </div><div className="space-y-3">
      {request.documents.map(doc => <div key={doc.id} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><strong className="text-sm text-slate-800">{doc.documentName}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${doc.status === 'UPLOADED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status}</span></div>{doc.status === 'PENDING' && <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" disabled={savingId === doc.id} onChange={event => upload(doc.id, event.target.files?.[0])} className="w-full text-xs text-slate-500" />}{savingId === doc.id && <div className="mt-2 text-xs text-blue-600">Uploading…</div>}</div>)}
    </div><p className="mt-5 text-[11px] text-slate-400">Accepted: PDF, JPG, PNG, WEBP · Maximum 5 MB per file</p></>}
  </div></div>
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
  const latestNotificationId = useRef<string | null>(null)

  const loadCases = async () => {
    const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases`, { credentials: 'include', cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || 'Unable to load applications')
    const loadedCases = Array.isArray(result.data) ? result.data as CaseRecord[] : []
    setCases(loadedCases)
    return loadedCases
  }

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/fcu/auth/me`, { credentials: 'include' })
      .then(async response => response.ok ? (await response.json()).data as FcuUser : null)
      .then(setAuthUser)
      .catch(() => setAuthUser(null))
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
      fetch(`${API_BASE_URL}/api/fcu/auth/sidebar`, { credentials: 'include' })
        .then(async response => {
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
        const response = await fetch(`${API_BASE_URL}/api/fcu/auth/notifications`, { credentials: 'include', cache: 'no-store' })
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
      if (viewCase) await releaseCaseClaim(viewCase)
      await fetch(`${API_BASE_URL}/api/fcu/auth/logout`, { method: 'POST', credentials: 'include' })
    } finally {
      setViewCase(null)
      setActiveNav('Dashboard')
      setAuthUser(null)
    }
  }

  const openNotification = async (notification: FcuNotification) => {
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, isRead: true } : item))
    setNotificationsOpen(false)
    void fetch(`${API_BASE_URL}/api/fcu/auth/notifications/${notification.applicationId}/read`, { method: 'PATCH', credentials: 'include' })
    let application = cases.find(item => Number(item.databaseId || item.id) === notification.applicationId)
    if (!application) {
      try { application = (await loadCases()).find(item => Number(item.databaseId || item.id) === notification.applicationId) } catch { /* handled by applications screen */ }
    }
    setActiveNav('Applications')
    if (application) await claimAndOpenCase(application)
  }

  const markAllNotificationsAsRead = async () => {
    setNotifications(current => current.map(item => ({ ...item, isRead: true })))
    await fetch(`${API_BASE_URL}/api/fcu/auth/notifications/read-all`, { method: 'PATCH', credentials: 'include' })
  }

  const toggleNotifications = async () => {
    setNotificationsOpen(open => !open)
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission()
  }

  const claimAndOpenCase = async (caseItem: CaseRecord) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseItem.databaseId || caseItem.id}/claim`, { method: 'POST', credentials: 'include' })
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

  const releaseCaseClaim = async (caseItem: CaseRecord) => {
    try { await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${caseItem.databaseId || caseItem.id}/claim`, { method: 'DELETE', credentials: 'include' }) } catch { /* Lock expires automatically. */ }
    setCases(current => current.map(item => item.id === caseItem.id ? { ...item, lock: null } : item))
  }

  const closeCaseDrawer = async () => {
    if (viewCase) await releaseCaseClaim(viewCase)
    setViewCase(null)
  }

  useEffect(() => {
    if (!viewCase) return
    const heartbeat = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${viewCase.databaseId || viewCase.id}/heartbeat`, { method: 'POST', credentials: 'include' })
        if (response.status === 409) {
          await fetch(`${API_BASE_URL}/api/fcu/auth/cases/${viewCase.databaseId || viewCase.id}/claim`, { method: 'POST', credentials: 'include' })
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

  const activeCases = cases.filter(caseItem => {
    const terminalStatuses = ['SENT_TO_CREDIT', 'DISBURSED', 'REJECTED', 'FORWARDED_REJECT']
    const sourceStatus = String(caseItem.sourceStatus || '').trim().toUpperCase().replace(/[\s-]+/g, '_')
    return ['SENT_TO_FCU', 'SENT_FCU'].includes(sourceStatus)
      && caseItem.workflowStage !== 'FINALIZED'
      && !terminalStatuses.includes(caseItem.status)
  })

  const pageConfig: Record<string, { title: string; statusMatch: (status: string) => boolean }> = {
    Applications: {
      title: 'Applications',
      statusMatch: () => true,
    },
    Approved: {
      title: 'Approved Cases',
      statusMatch: status => status === 'APPROVED',
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
      statusMatch: status => status === 'REJECTED' || status === 'FORWARDED_REJECT',
    },
    'Credit Team': {
      title: 'Credit Team Queue',
      statusMatch: status => status === 'SENT_TO_CREDIT',
    },
  }

  const filtered = cases.filter(c => {
    const q = searchQuery.toLowerCase()
    const matchSearch = !searchQuery ||
      c.borrower.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.mobile.includes(q)
    const matchPageStatus = activeNav === 'Applications'
      ? activeCases.some(activeCase => activeCase.id === c.id)
      : activeNav === 'Dashboard' || activeNav === 'Lead Tracker' || activeNav === 'Reports'
        ? true
        : pageConfig[activeNav]?.statusMatch(c.status) ?? true
    const matchPurpose = selectedPurpose === 'All Purposes' || c.purpose === selectedPurpose.toUpperCase()
    const matchBranch = selectedBranch === 'All Branches' || c.branch === selectedBranch.toUpperCase()
    return matchSearch && matchPageStatus && matchPurpose && matchBranch
  })

  const stats = [
    { label: 'ACTIVE CASES',        value: String(cases.length),      color: 'border-blue-500' },
    { label: 'FUNDED TOTAL AMOUNT', value: '₹8.5L',                   color: 'border-emerald-500' },
    { label: 'RECOVERED AMOUNT',    value: '₹1.9L',                   color: 'border-purple-500' },
    { label: 'CASE RECOVERY RATIO', value: '₹34,000',                 color: 'border-orange-500' },
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

  const customerUploadToken = window.location.pathname.match(/^\/customer-upload\/([a-f0-9]+)$/i)?.[1]
  if (customerUploadToken) return <LegacyCustomerUploadPage token={customerUploadToken} />

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold tracking-wide text-slate-300">Checking secure session…</div>
  }
  if (!authUser) return <LoginPage onLogin={setAuthUser} />

  return (
    <div className="min-h-screen bg-[#f6f8fc] flex flex-col text-xs">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_10px_35px_rgba(15,23,42,0.06)] z-40 shrink-0">
        <div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 px-3 py-2 lg:h-16 lg:flex-nowrap lg:gap-3 lg:px-4 lg:py-0">
          <div className="shrink-0">
            <img src="/assets/geetpay-logo.png" alt="GeetPay - Product of Waqt Finance" className="h-10 w-auto max-w-[150px] object-contain object-left sm:max-w-[180px]" />
          </div>

          <nav className="order-3 flex w-full items-center overflow-x-auto px-0 lg:order-none lg:w-auto lg:flex-1 lg:justify-center lg:px-2">
            <div className="flex min-w-max items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1 shadow-inner lg:min-w-[520px]">
              {NAV_ITEMS.map(item => (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-all ${
                    activeNav === item
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
            <button
              onClick={() => setActiveNav('Lead Tracker')}
              className={`rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                activeNav === 'Lead Tracker'
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
        {activeNav === 'Dashboard' && <Dashboard />}

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
                    <option>Home Repair</option>
                    <option>Education</option>
                    <option>Business</option>
                    <option>Medical</option>
                    <option>Agriculture</option>
                  </select>
                  <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-600 focus:border-blue-400 focus:outline-none">
                    <option>All Branches</option>
                    <option>Panrose Delhi</option>
                    <option>Nazut Delhi</option>
                    <option>Goztep Varanasi</option>
                    <option>Goztep Jaipur</option>
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
                          {activeNav === 'Applications' && (
                            <th className="px-2 py-2 text-center font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((c, i) => (
                          <Fragment key={c.id}>
                            <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                              {activeNav === 'Applications' && (
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => claimAndOpenCase(c)}
                                    disabled={Boolean(c.lock && !c.lock.isMine)}
                                    title={c.lock && !c.lock.isMine ? `Being reviewed by ${c.lock.userName}` : 'Open and claim application'}
                                    className={`rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${c.lock && !c.lock.isMine ? 'cursor-not-allowed bg-amber-100 text-amber-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                  >
                                    {c.lock && !c.lock.isMine ? `In review: ${c.lock.userName}` : 'View'}
                                  </button>
                                </td>
                              )}
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
