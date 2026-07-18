import React, { createContext, useState, useContext, useEffect } from 'react';
import { api, getAccessToken, getCurrentUser, setCurrentUser, setTokens, clearTokens, getBaseUrl, setBaseUrl } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiUrl, setApiUrl] = useState('http://10.0.2.2:5000/api');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUrl = await getBaseUrl();
        setApiUrl(savedUrl);
        
        const token = await getAccessToken();
        const currentUser = await getCurrentUser();
        if (token && currentUser) {
          setUser(currentUser);
        }
      } catch (e) {
        console.error("Failed to initialize auth state", e);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      // Handle response depending on wrapper structure
      const accessToken = res.accessToken || res.token || '';
      const refreshToken = res.refreshToken || '';
      const userData = res.user || { email, role: 'user', name: res.name || 'User' };
      
      await setTokens(accessToken, refreshToken);
      await setCurrentUser(userData);
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    try {
      await clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateApiUrl = async (newUrl) => {
    await setBaseUrl(newUrl);
    setApiUrl(newUrl);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, apiUrl, updateApiUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
