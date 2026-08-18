"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const enrichmentController_1 = require("../controllers/enrichmentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all enrichment routes
router.use(authMiddleware_1.authMiddleware);
router.post('/pan', enrichmentController_1.verifyPan);
router.post('/aadhaar', enrichmentController_1.verifyAadhaar);
router.post('/uan', enrichmentController_1.verifyUan);
router.post('/cibil', enrichmentController_1.verifyCibil);
exports.default = router;
