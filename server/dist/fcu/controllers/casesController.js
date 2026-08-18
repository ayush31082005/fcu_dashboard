"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCases = void 0;
const casesModel_1 = require("../models/casesModel");
const getCases = async (_req, res) => {
    try {
        const cases = await (0, casesModel_1.findAllCases)();
        res.json({ status: 'success', data: cases });
    }
    catch (error) {
        console.error('FCU cases error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load FCU applications' });
    }
};
exports.getCases = getCases;
