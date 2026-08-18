"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSidebarData = void 0;
const db_1 = __importDefault(require("../../config/db"));
const getSidebarData = async (userId) => {
    const [activityRows] = await db_1.default.query(`
    SELECT id, action, ip_address, user_agent, created_at
    FROM fcu_login_activity
    WHERE fcu_user_id = ?
    ORDER BY created_at DESC LIMIT 8
  `, [userId]);
    const [monthRows] = await db_1.default.query(`
    SELECT
      COUNT(*) AS reviewed,
      SUM(CASE WHEN case_status = 'FRAUD_FLAGGED' THEN 1 ELSE 0 END) AS fraudFound,
      SUM(CASE WHEN case_status IN ('APPROVED', 'SENT_TO_CREDIT') THEN 1 ELSE 0 END) AS cleared,
      SUM(CASE WHEN stage <> 'FINALIZED' THEN 1 ELSE 0 END) AS pending
    FROM fcu_case_workflows
    WHERE reviewed_by = ?
      AND YEAR(updated_at) = YEAR(CURRENT_DATE())
      AND MONTH(updated_at) = MONTH(CURRENT_DATE())
  `, [userId]);
    return { activities: activityRows, month: monthRows[0] || {} };
};
exports.getSidebarData = getSidebarData;
