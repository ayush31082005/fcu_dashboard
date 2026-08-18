"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAllNotifications = exports.readNotification = exports.listNotifications = void 0;
const notificationModel_1 = require("../../models/fcuModels/notificationModel");
const listNotifications = async (req, res) => {
    try {
        const userId = Number(req.fcuUser.id);
        const notifications = await (0, notificationModel_1.getNotifications)(userId);
        res.json({ status: 'success', data: notifications, unreadCount: notifications.filter((item) => !item.isRead).length });
    }
    catch (error) {
        console.error('FCU notifications error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to load notifications' });
    }
};
exports.listNotifications = listNotifications;
const readNotification = async (req, res) => {
    try {
        const found = await (0, notificationModel_1.markNotificationRead)(Number(req.fcuUser.id), Number(req.params.applicationId));
        if (!found) {
            res.status(404).json({ status: 'error', message: 'Application not found' });
            return;
        }
        res.json({ status: 'success' });
    }
    catch (error) {
        console.error('FCU notification read error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to mark notification as read' });
    }
};
exports.readNotification = readNotification;
const readAllNotifications = async (req, res) => {
    try {
        await (0, notificationModel_1.markAllNotificationsRead)(Number(req.fcuUser.id));
        res.json({ status: 'success' });
    }
    catch (error) {
        console.error('FCU notifications read-all error:', error);
        res.status(500).json({ status: 'error', message: 'Unable to mark notifications as read' });
    }
};
exports.readAllNotifications = readAllNotifications;
