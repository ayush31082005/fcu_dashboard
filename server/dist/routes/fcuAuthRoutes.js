"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/fcuController/authController");
const fcuAuthMiddleware_1 = require("../middleware/fcuAuthMiddleware");
const casesController_1 = require("../controllers/fcuController/casesController");
const router = (0, express_1.Router)();
// Registration is API-only by design; use Postman or another trusted admin client.
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/me', fcuAuthMiddleware_1.requireFcuAuth, authController_1.me);
router.post('/logout', fcuAuthMiddleware_1.requireFcuAuth, authController_1.logout);
router.get('/cases', fcuAuthMiddleware_1.requireFcuAuth, casesController_1.getCases);
exports.default = router;
