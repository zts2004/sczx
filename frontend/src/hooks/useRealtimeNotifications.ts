import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

type ServerNotification = {
  id: number;
  type: string;
  title: string;
  content: string;
  createdAt: string;
};

export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<{ id: string; title: string; description?: string }[]>([]);

  const enabled = !!user?.id;

  const baseUrl = useMemo(() => {
    // dev 下同源即可；如需跨域再改
    return window.location.origin.replace(':3000', ':3001');
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const s = io(baseUrl, { transports: ['websocket'] });
    setSocket(s);
    s.emit('auth', { userId: user!.id });

    s.on('notification', (n: ServerNotification) => {
      const id = `${n.id}-${Date.now()}`;
      setToasts((prev) => [{ id, title: n.title, description: n.content }, ...prev].slice(0, 5));
      // 3 秒自动消失
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 3000);
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [enabled, user, baseUrl]);

  return { socket, toasts };
}

