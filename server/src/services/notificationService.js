import Notification from '../models/Notification.js';

let ioInstance;

export function setIO(io) {
  ioInstance = io;
}

export async function createNotification({ team, user, type, title, message, link = '' }) {
  const notification = await Notification.create({
    team,
    user,
    type,
    title,
    message,
    link,
  });

  if (ioInstance) {
    ioInstance.to(`user:${user}`).emit('notification', notification);
  }

  return notification;
}

export async function notifyTeam({ teamId, excludeUserId, type, title, message, link = '' }) {
  const User = (await import('../models/User.js')).default;
  const members = await User.find({ team: teamId, isActive: true, _id: { $ne: excludeUserId } });

  await Promise.all(
    members.map((member) =>
      createNotification({
        team: teamId,
        user: member._id,
        type,
        title,
        message,
        link,
      })
    )
  );
}
