/**
 * Auth Context for managing user data
 * src/context/AuthContext.tsx
 */

import { createContext, ReactNode, useState, useEffect } from 'react';
import apiClient from '../config/axiosConfig';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    country_code: string;
  };
  role: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (userData: any) => Promise<void>;
  updateProfile: (userData: Partial<AuthUser>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in (on mount)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          setIsLoading(true);
          // Adjust endpoint to your actual profile endpoint
          const { data } = await apiClient.get('/users/profile');
          setUser(data.data);
        } catch (err) {
          console.error('Auth check failed:', err);
          localStorage.removeItem('authToken');
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      const { token, user: userData } = data.data;

      localStorage.setItem('authToken', token);
      setUser(userData);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const signup = async (userData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/signup', userData);
      const { token, user: newUser } = data.data;

      localStorage.setItem('authToken', token);
      setUser(newUser);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Signup failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: Partial<AuthUser>) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.put('/users/profile', userData);
      setUser(data.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Update failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        signup,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
