import Notification from '../models/Notification.js';

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(40);
  return res.json({ notifications });
}

export async function markRead(req, res) {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );
  return res.json({ ok: true });
}
