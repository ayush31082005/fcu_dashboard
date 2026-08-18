import { Request, Response } from 'express';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../models/fcuModels/notificationModel';

export const listNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number((req as any).fcuUser.id);
    const notifications = await getNotifications(userId);
    res.json({ status: 'success', data: notifications, unreadCount: notifications.filter((item: any) => !item.isRead).length });
  } catch (error) {
    console.error('FCU notifications error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to load notifications' });
  }
};

export const readNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const found = await markNotificationRead(Number((req as any).fcuUser.id), Number(req.params.applicationId));
    if (!found) { res.status(404).json({ status: 'error', message: 'Application not found' }); return; }
    res.json({ status: 'success' });
  } catch (error) {
    console.error('FCU notification read error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to mark notification as read' });
  }
};

export const readAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    await markAllNotificationsRead(Number((req as any).fcuUser.id));
    res.json({ status: 'success' });
  } catch (error) {
    console.error('FCU notifications read-all error:', error);
    res.status(500).json({ status: 'error', message: 'Unable to mark notifications as read' });
  }
};
