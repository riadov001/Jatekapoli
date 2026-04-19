import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "tawsila_jwt";
const USER_KEY = "tawsila_user";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  loyaltyPoints: number;
  address?: string | null;
  avatarUrl?: string | null;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") { localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

async function secureDel(key: string): Promise<void> {
  if (Platform.OS === "web") { localStorage.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wire up auth token getter for API client
    setAuthTokenGetter(() => secureGet(TOKEN_KEY));

    // Load persisted auth on startup
    Promise.all([secureGet(TOKEN_KEY), secureGet(USER_KEY)]).then(([t, u]) => {
      if (t) setToken(t);
      if (u) { try { setUser(JSON.parse(u)); } catch {} }
      setIsLoading(false);
    });
  }, []);

  const login = async (newToken: string, newUser: AuthUser) => {
    await secureSet(TOKEN_KEY, newToken);
    await secureSet(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await secureDel(TOKEN_KEY);
    await secureDel(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const updateUser = async (newUser: AuthUser) => {
    await secureSet(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
