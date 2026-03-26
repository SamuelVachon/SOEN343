"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type firebase from "firebase/compat/app";
import { auth } from "../lib/firebaseClient";
import { AnalyticsService } from "../services/AnalyticsService";

type AuthContextType = {
  user: firebase.User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let previousUser: firebase.User | null = null;
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);

      if (u && !previousUser) {
        // User logged in
        sessionStorage.setItem("loginTime", Date.now().toString());
        AnalyticsService.getInstance().trackEvent("USER_LOGIN", { userId: u.uid });
      }
      previousUser = u;
    });
    return () => unsub();
  }, []);

  // Screen time tracking interval
  useEffect(() => {
    if (!user) return;

    // Send a 60-second increment to the analytics queue every minute
    const interval = setInterval(() => {
      AnalyticsService.getInstance().trackEvent("SCREEN_TIME_LOGGED", { 
        userId: user.uid,
        durationInSeconds: 60 
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
