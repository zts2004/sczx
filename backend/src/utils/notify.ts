import prisma from './prisma';
import { io } from '../app';

export async function createAndPushNotification(input: {
  userId: number;
  type: string;
  title: string;
  content: string;
}) {
  const notif = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      content: input.content,
    },
  });

  // 推送到该用户房间
  io.to(`user:${input.userId}`).emit('notification', {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    content: notif.content,
    createdAt: notif.createdAt,
  });

  return notif;
}

