import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, handleApiError } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await apiClient.getCurrentUser();
          setUser(response.user);
        } catch (error) {
          // Token is invalid, clear it
          apiClient.clearToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    try {
      const response = await apiClient.register({
        email,
        password,
        username,
        fullName,
      });
      
      setUser(response.user);
      navigate('/');
      return { error: null };
    } catch (error) {
      return { error: handleApiError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
      navigate('/');
      return { error: null };
    } catch (error) {
      return { error: handleApiError(error) };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
