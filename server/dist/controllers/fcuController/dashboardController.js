"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const dashboardModel_1 = require("../../models/fcuModels/dashboardModel");
const getDashboard = async (_req, res) => {
    try {
        res.json({ status: 'success', data: await (0, dashboardModel_1.getDashboardData)() });
    }
    catch (error) {
        console.error('FCU dashboard error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load FCU dashboard', code: error?.code });
    }
};
exports.getDashboard = getDashboard;
