"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const db_1 = __importDefault(require("../../config/db"));
const casesModel_1 = require("./casesModel");
const getDashboardData = async () => {
    const allCases = await (0, casesModel_1.findAllCases)();
    const isSentToFcu = (caseItem) => {
        const raw = String(caseItem.sourceStatus || '').toUpperCase().replace(/[\s_-]+/g, '_');
        return raw === 'SENT_TO_FCU' || raw === 'SENT_FCU' || raw.includes('FCU');
    };
    const total = allCases.length;
    const pendingCases = allCases.filter(c => !['APPROVED', 'FCU_APPROVED', 'DISBURSED', 'SENT_TO_CREDIT'].includes(c.status) && !c.status.includes('REJECT') && c.workflowStage !== 'FINALIZED' && isSentToFcu(c));
    const pending = pendingCases.length;
    const completed = Math.max(0, total - pending);
    const approved = allCases.filter(c => c.status === 'APPROVED' || c.status === 'FCU_APPROVED').length;
    const rejected = allCases.filter(c => c.status.includes('REJECT') || c.status === 'FORWARDED_REJECT').length;
    const fraudDetected = allCases.filter(c => (c.flags && c.flags.length > 0) || c.fraudStatus === 'REPORT_FRAUD' || c.status === 'FRAUD_FLAGGED').length;
    const fcuFilter = `(
    LOWER(TRIM(REPLACE(COALESCE(a.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu', 'send fcu', 'sent fcu', 'fcu approved', 'fcu rejected', 'sent to credit', 'forwarded reject', 'disbursed', 'approved', 'rejected', 'loan reject', 'rejected by fcu', 'rejected by credit')
    OR EXISTS (
      SELECT 1 FROM leads ld 
      WHERE (ld.user_id = a.user_id OR ld.lead_id = (SELECT lead_number FROM users WHERE id = a.user_id) OR ld.lead_id = (SELECT lead_reference_number FROM users WHERE id = a.user_id))
        AND LOWER(TRIM(REPLACE(COALESCE(ld.status, ''), '_', ' '))) IN ('send to fcu', 'sent to fcu', 'send fcu', 'sent fcu', 'fcu approved', 'fcu rejected', 'sent to credit', 'forwarded reject', 'disbursed', 'approved', 'rejected', 'loan reject', 'rejected by fcu', 'rejected by credit')
    )
    OR EXISTS (
      SELECT 1 FROM fcu_case_workflows w WHERE w.application_id = a.id
    )
    OR EXISTS (
      SELECT 1 FROM rejected_loans rl WHERE rl.user_id = a.user_id OR rl.application_id = a.id
    )
    OR EXISTS (
      SELECT 1 FROM application_logs al 
      WHERE al.user_id = a.user_id 
        AND (
          UPPER(REPLACE(TRIM(COALESCE(al.status, '')), '_', ' ')) = 'SENT TO FCU' 
          OR UPPER(COALESCE(al.status, '')) LIKE '%FCU%'
          OR UPPER(COALESCE(al.status, '')) LIKE '%REJECT%'
          OR UPPER(COALESCE(al.action, '')) LIKE '%FCU%'
          OR UPPER(COALESCE(al.action, '')) LIKE '%REJECT%'
        )
    )
  )`;
    const [summaryRows] = await db_1.default.query(`
    SELECT
      ROUND(AVG(CASE WHEN w.updated_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, a.created_at, w.updated_at) / 24 END), 1) AS avgTat
    FROM applications a
    LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
    WHERE ${fcuFilter}
  `);
    const [dailyRows] = await db_1.default.query(`
    SELECT DATE_FORMAT(days.day, '%a') AS day,
      COUNT(fcu_apps.id) AS assigned,
      SUM(CASE WHEN fcu_apps.stage = 'FINALIZED' OR fcu_apps.status IN ('SENT_TO_CREDIT', 'FORWARDED_REJECT', 'FCU_APPROVED', 'FCU_REJECTED') THEN 1 ELSE 0 END) AS completed
    FROM (
      SELECT CURDATE() - INTERVAL 6 DAY AS day UNION ALL SELECT CURDATE() - INTERVAL 5 DAY UNION ALL
      SELECT CURDATE() - INTERVAL 4 DAY UNION ALL SELECT CURDATE() - INTERVAL 3 DAY UNION ALL
      SELECT CURDATE() - INTERVAL 2 DAY UNION ALL SELECT CURDATE() - INTERVAL 1 DAY UNION ALL SELECT CURDATE()
    ) days
    LEFT JOIN (
      SELECT a.id, a.user_id, a.created_at, a.status, w.stage
      FROM applications a
      LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
      WHERE ${fcuFilter}
    ) fcu_apps ON DATE(fcu_apps.created_at) = days.day
    GROUP BY days.day ORDER BY days.day
  `);
    const [monthlyRows] = await db_1.default.query(`
    SELECT DATE_FORMAT(months.month_start, '%b') AS month,
      SUM(CASE WHEN COALESCE(fcu_apps.case_status, fcu_apps.status) IN ('approved','APPROVED') THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN COALESCE(fcu_apps.case_status, fcu_apps.status) IN ('rejected','loan reject','REJECTED','FORWARDED_REJECT') THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN fcu_apps.stage <> 'FINALIZED' AND COALESCE(fcu_apps.case_status, fcu_apps.status) IN ('pending','draft','in review','PENDING','UNDER_REVIEW','FIELD_VERIFICATION') THEN 1 ELSE 0 END) AS pending
    FROM (
      SELECT DATE_FORMAT(CURDATE() - INTERVAL 5 MONTH, '%Y-%m-01') AS month_start UNION ALL
      SELECT DATE_FORMAT(CURDATE() - INTERVAL 4 MONTH, '%Y-%m-01') UNION ALL
      SELECT DATE_FORMAT(CURDATE() - INTERVAL 3 MONTH, '%Y-%m-01') UNION ALL
      SELECT DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01') UNION ALL
      SELECT DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') UNION ALL
      SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01')
    ) months
    LEFT JOIN (
      SELECT a.id, a.user_id, a.created_at, a.status, w.case_status, w.stage
      FROM applications a
      LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
      WHERE ${fcuFilter}
    ) fcu_apps ON DATE_FORMAT(fcu_apps.created_at, '%Y-%m') = DATE_FORMAT(months.month_start, '%Y-%m')
    GROUP BY months.month_start ORDER BY months.month_start
  `);
    const [statusRows] = await db_1.default.query(`
    SELECT UPPER(REPLACE(COALESCE(w.case_status, a.status, 'PENDING'), ' ', '_')) AS name, COUNT(*) AS value
    FROM applications a LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
    WHERE ${fcuFilter}
    GROUP BY name ORDER BY value DESC
  `);
    const [executiveRows] = await db_1.default.query(`
    SELECT fu.name, COUNT(w.id) AS cases,
      SUM(CASE WHEN w.stage = 'FINALIZED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN w.stage <> 'FINALIZED' THEN 1 ELSE 0 END) AS pending,
      ROUND(AVG(TIMESTAMPDIFF(HOUR, a.created_at, w.updated_at)) / 24, 1) AS tat
    FROM fcu_users fu
    LEFT JOIN fcu_case_workflows w ON w.reviewed_by = fu.id
    LEFT JOIN applications a ON a.id = w.application_id
    WHERE fu.status = 'active'
    GROUP BY fu.id, fu.name ORDER BY completed DESC, cases DESC
  `);
    const [branchRows] = await db_1.default.query(`
    SELECT COALESCE(NULLIF(ed.work_city, ''), NULLIF(up.city, ''), 'Unassigned') AS name,
      COUNT(a.id) AS assigned,
      SUM(CASE WHEN COALESCE(w.case_status, a.status) IN ('approved','APPROVED') THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN COALESCE(w.case_status, a.status) IN ('rejected','loan reject','REJECTED','FORWARDED_REJECT') THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN w.stage <> 'FINALIZED' AND COALESCE(w.case_status, a.status) IN ('pending','draft','in review','PENDING','UNDER_REVIEW','FIELD_VERIFICATION') THEN 1 ELSE 0 END) AS pending,
      ROUND(AVG(CASE WHEN w.updated_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, a.created_at, w.updated_at) / 24 END), 1) AS tat
    FROM applications a
    JOIN users u ON u.id = a.user_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN employment_details ed ON ed.user_id = u.id
    LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
    WHERE ${fcuFilter}
    GROUP BY name ORDER BY assigned DESC LIMIT 8
  `);
    const [purposeRows] = await db_1.default.query(`
    SELECT COALESCE(NULLIF(loan_purpose, ''), 'Other') AS purpose, COUNT(*) AS count
    FROM applications a
    LEFT JOIN fcu_case_workflows w ON w.application_id = a.id
    WHERE ${fcuFilter}
    GROUP BY purpose ORDER BY count DESC LIMIT 8
  `);
    const summary = summaryRows[0] || {};
    return {
        summary: {
            totalCases: total,
            assigned: total,
            pending,
            completed,
            approved,
            rejected,
            avgTat: Number(summary.avgTat || 0.1),
            approvalRatio: total ? Number(((approved / total) * 100).toFixed(1)) : 0,
            rejectionRatio: total ? Number(((rejected / total) * 100).toFixed(1)) : 0,
            fraudDetected,
        },
        dailyCases: dailyRows.map((row) => ({ day: row.day, assigned: Number(row.assigned), completed: Number(row.completed), pending: Math.max(0, Number(row.assigned) - Number(row.completed)) })),
        tatTrend: monthlyRows.map((row) => ({ week: row.month, tat: Number(summary.avgTat || 0) })),
        approvalTrend: monthlyRows.map((row) => ({ month: row.month, approved: Number(row.approved), rejected: Number(row.rejected), pending: Number(row.pending) })),
        caseStatusPie: statusRows.map((row) => ({ name: row.name, value: Number(row.value) })),
        executives: executiveRows.map((row) => {
            const cases = Number(row.cases || 0);
            const completed = Number(row.completed || 0);
            return { name: row.name, cases, completed, pending: Number(row.pending || 0), tat: `${Number(row.tat || 0)}d`, score: cases ? Math.round((completed / cases) * 100) : 0 };
        }),
        branches: branchRows.map((row) => ({ ...row, assigned: Number(row.assigned), approved: Number(row.approved), rejected: Number(row.rejected), pending: Number(row.pending), tat: Number(row.tat || 0) })),
        purposeBar: purposeRows.map((row) => ({ purpose: row.purpose, count: Number(row.count) })),
    };
};
exports.getDashboardData = getDashboardData;
