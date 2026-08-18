"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("./authController");
const authMiddleware_1 = require("./authMiddleware");
const leadsController_1 = require("./leadsController");
const telecallerSubController_1 = require("./telecallerSubController");
const router = (0, express_1.Router)();
// Public auth routes
router.post('/auth/login', authController_1.login);
router.post('/auth/register', authController_1.register); // Used for initial setup
// Protected routes
router.post('/auth/logout', authMiddleware_1.requireTelecallerAuth, authController_1.logout);
// Protected routes
router.get('/dashboard', authMiddleware_1.requireTelecallerAuth, (req, res) => {
    res.json({ status: 'success', data: { message: 'Welcome to the telecaller dashboard!' } });
});
router.get('/leads', authMiddleware_1.requireTelecallerAuth, leadsController_1.getLeads);
router.get('/leads/:userId/logs', authMiddleware_1.requireTelecallerAuth, leadsController_1.getLeadLogs);
router.post('/leads/:userId/logs', authMiddleware_1.requireTelecallerAuth, leadsController_1.addLeadLog);
// Telecaller dynamic subtab routes
router.get('/lead/:userId/telecaller-data', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.getTelecallerData);
router.put('/lead/:userId/details', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.updateTelecallerDetails);
router.post('/lead/:userId/follow-up', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.addFollowUp);
router.post('/lead/:userId/share-link', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.addShareLink);
router.put('/lead/:userId/share-link/:linkId/status', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.updateShareLinkStatus);
router.post('/lead/:userId/note', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.addNote);
router.post('/lead/:userId/salary-credit', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.addSalaryCredit);
router.post('/lead/:userId/upload-doc', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.uploadDocument);
router.get('/lead/:userId/duplicates', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.findDuplicates);
router.get('/lead/:userId/tasks', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.getTasks);
router.post('/lead/:userId/tasks', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.addTask);
router.put('/lead/:userId/tasks/:taskId/status', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.updateTaskStatus);
// Telecaller management routes
router.get('/list', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.getTelecallersList);
router.put('/lead/:userId/assign', authMiddleware_1.requireTelecallerAuth, telecallerSubController_1.assignTelecaller);
exports.default = router;
