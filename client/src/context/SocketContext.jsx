import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, team } = useAuth();
  const [socket, setSocket] = useState(null);
  const [liveNotification, setLiveNotification] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return undefined;
    }

    const token = localStorage.getItem('relay_token');
    const s = io(window.location.origin.includes('5173')
      ? 'http://localhost:5000'
      : undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      if (team?.id || team?._id) {
        s.emit('join-team', team.id || team._id);
      }
    });

    s.on('notification', (payload) => {
      setLiveNotification(payload);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, team?._id]);

  return (
    <SocketContext.Provider value={{ socket, liveNotification, clearLive: () => setLiveNotification(null) }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
