"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const onboardingController_1 = require("../controllers/onboardingController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Apply auth middleware to all onboarding routes
router.use(authMiddleware_1.authMiddleware);
router.post('/basic-details', onboardingController_1.saveBasicDetails);
router.post('/personal-details', onboardingController_1.savePersonalDetails);
router.post('/employment-details', onboardingController_1.saveEmploymentDetails);
router.post('/bank-details', onboardingController_1.saveBankDetails);
router.post('/reference-details', onboardingController_1.saveReferenceDetails);
router.post('/aadhaar-details', onboardingController_1.saveAadhaarDetails);
router.post('/upload-selfie', onboardingController_1.uploadSelfie);
router.post('/metadata', onboardingController_1.saveMetadata);
router.get('/user-data/:userId', onboardingController_1.getUserData);
router.get('/dashboard/:userId', onboardingController_1.getDashboardData);
exports.default = router;
