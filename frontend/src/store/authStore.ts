import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  studentId?: string;
  email: string;
  role: string;
  realName?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<void>;
  init: () => void;
}

// 从localStorage加载认证信息
const loadAuthFromStorage = () => {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user || null,
        token: parsed.token || null,
      };
    }
  } catch (e) {
    // 忽略解析错误
  }
  return { user: null, token: null };
};

// 保存认证信息到localStorage
const saveAuthToStorage = (user: User | null, token: string | null) => {
  try {
    localStorage.setItem('auth-storage', JSON.stringify({ user, token }));
  } catch (e) {
    // 忽略存储错误
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    set({ user, token });
    saveAuthToStorage(user, token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  clearAuth: () => {
    set({ user: null, token: null });
    saveAuthToStorage(null, null);
    delete axios.defaults.headers.common['Authorization'];
  },
  checkAuth: async () => {
    const { token } = get();
    if (!token) return;

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('/api/auth/me');
      const user = response.data.data;
      set({ user });
      saveAuthToStorage(user, token);
    } catch (error) {
      get().clearAuth();
    }
  },
  init: () => {
    const { user, token } = loadAuthFromStorage();
    if (token) {
      set({ user, token });
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
}));

