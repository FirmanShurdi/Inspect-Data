import { createContext, useState, useEffect, useContext, useRef } from 'react';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 Menit (1.800.000 ms)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState(null);
  const lastActivityRef = useRef(Date.now());

  // Function to show flash notification
  const showFlash = (message, type = 'info') => {
    setFlash({ message, type });
  };

  const clearFlash = () => {
    setFlash(null);
  };

  const fetchUserData = async () => {
    // Strictly use sessionStorage for session isolation across tabs/browsers
    const token = sessionStorage.getItem('token');
    const savedUser = sessionStorage.getItem('user');

    if (token && savedUser) {
      try {
        const lastActivity = parseInt(sessionStorage.getItem('lastActivity') || `${Date.now()}`, 10);
        const timeDiff = Date.now() - lastActivity;

        if (timeDiff > INACTIVITY_TIMEOUT) {
          // Inactivity expired
          sessionStorage.clear();
          localStorage.clear();
          setUser(null);
          showFlash('Sesi Anda telah habis, silahkan login kembali!', 'warning');
        } else {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          // Refresh last activity
          sessionStorage.setItem('lastActivity', `${Date.now()}`);
          lastActivityRef.current = Date.now();

          // Sync fresh user data (photo, name, role) from API
          if (parsed?.id_user) {
            fetch(`/api/users/${parsed.id_user}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.json())
              .then((res) => {
                if (res?.data) {
                  setUser(res.data);
                  sessionStorage.setItem('user', JSON.stringify(res.data));
                }
              })
              .catch(() => {});
          }
        }
      } catch (error) {
        console.error('Session data error:', error);
        sessionStorage.clear();
        setUser(null);
      }
    } else {
      // Clear any legacy localStorage items to enforce strict tab session isolation
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Lightweight Throttled User Activity Listener
  useEffect(() => {
    if (!user) return;

    let lastUpdate = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle update: only update once every 10 seconds to keep performance super fast & lightweight
      if (now - lastUpdate > 10000) {
        lastUpdate = now;
        lastActivityRef.current = now;
        sessionStorage.setItem('lastActivity', `${now}`);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Periodic Inactivity Checker (every 15 seconds)
    const interval = setInterval(() => {
      const lastAct = parseInt(sessionStorage.getItem('lastActivity') || `${lastActivityRef.current}`, 10);
      if (Date.now() - lastAct > INACTIVITY_TIMEOUT) {
        sessionStorage.clear();
        localStorage.clear();
        setUser(null);
        showFlash('Sesi Anda telah habis, silahkan login kembali!', 'warning');
        window.location.href = '/login';
      }
    }, 15000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(interval);
    };
  }, [user]);

  const login = async (token, userData) => {
    sessionStorage.clear();
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('lastActivity', `${Date.now()}`);
    lastActivityRef.current = Date.now();

    if (userData) {
      sessionStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    await fetchUserData();
  };

  const logout = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '/login';
  };

  const updateUserSession = (updatedUser) => {
    if (updatedUser) {
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const value = { user, loading, flash, showFlash, clearFlash, login, logout, updateUserSession, fetchUserData };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
