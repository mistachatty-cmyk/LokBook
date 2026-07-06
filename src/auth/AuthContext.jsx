import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import * as auth from "./auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const initCbs = useRef([]);

  useEffect(() => {
    auth.init((s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      const cbs = initCbs.current;
      initCbs.current = [];
      cbs.forEach(cb => cb(s));
    });
    return auth.onAuthStateChange((s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
  }, []);

  const onInit = useCallback((cb) => {
    if (!loading) {
      cb(session);
      return () => {};
    }
    initCbs.current.push(cb);
    return () => {
      initCbs.current = initCbs.current.filter(c => c !== cb);
    };
  }, [loading, session]);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      isAuthenticated: auth.isAuthenticated,
      signInWithEmail: auth.signInWithEmail,
      signInWithOAuth: auth.signInWithOAuth,
      signOut: auth.signOut,
      getUserId: auth.getUserId,
      getEmail: auth.getEmail,
      getApiToken: auth.getApiToken,
      onInit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
