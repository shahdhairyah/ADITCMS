import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (saved && token) return JSON.parse(saved);
    } catch {
      // A corrupt or unreadable entry must not crash the whole app.
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
      authAPI.me()
        .then((res) => {
          if (res && res.success && res.data) {
            const fresh = {
              id: res.data.id,
              email: res.data.email,
              role: res.data.role,
              profile: res.data.profile || null,
              // Preserved across a reload: while it is true the API refuses
              // everything except the password change, so the router has to
              // keep sending the user to /change-password.
              must_change_password: res.data.must_change_password === true,
            };
            localStorage.setItem('user', JSON.stringify(fresh));
            setUser(fresh);
          }
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });

      if (!response || !response.success) {
        throw new Error(response?.message || 'Login failed');
      }

      const { token, user: userData } = response.data;

      if (!token || !userData) {
        throw new Error('Invalid response from server');
      }

      // The flag lives on the user object so ProtectedRoute and the router can
      // both see it without a second request.
      const session = {
        ...userData,
        must_change_password: response.data.must_change_password === true,
      };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(session));
      setUser(session);

      return session;
    } catch (err) {
      if (err instanceof Error) throw err;
      const msg = typeof err === 'string' ? err : err?.message || 'Invalid email or password';
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const updateUser = useCallback((newData) => {
    setUser((prev) => {
      const updated = { ...prev, ...newData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    role: user?.role || null,
    profile: user?.profile || null,
    // True while the account still holds the provisioning password set by
    // api/setup_passwords.php.
    mustChangePassword: user?.must_change_password === true,
  }), [user, loading, login, logout, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
