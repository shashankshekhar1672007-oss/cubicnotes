import { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  /* Rehydrate session on first load */
  useEffect(() => {
    const token = localStorage.getItem("cubicnotes_token");
    const cached = localStorage.getItem("cubicnotes_user");

    if (token && cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem("cubicnotes_token");
        localStorage.removeItem("cubicnotes_user");
        setLoading(false);
        return;
      }
      setLoading(false);

      // Validate token is still good in the background
      api.get("/auth/me")
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem("cubicnotes_user", JSON.stringify(data));
        })
        .catch(() => {}); // interceptor handles logout on 401
    } else {
      setLoading(false);
    }
  }, []);

  const persistSession = (token, userData) => {
    localStorage.setItem("cubicnotes_token", token);
    localStorage.setItem("cubicnotes_user", JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistSession(data.token, data.user);
    return data.user;
  }, []);

  /**
   * Step 1: Send registration data → backend sends OTP email.
   * Does NOT log the user in yet. Returns { message, email }.
   */
  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data; // { message: "OTP sent to your email", email }
  }, []);

  /**
   * Step 2: Verify OTP → backend creates user and returns JWT.
   */
  const verifyOtp = useCallback(async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });
    persistSession(data.token, data.user);
    return data.user;
  }, []);

  /**
   * Resend a fresh OTP for a pending registration.
   */
  const resendOtp = useCallback(async (email) => {
    const { data } = await api.post("/auth/resend-otp", { email });
    return data; // { message }
  }, []);

  const googleLogin = useCallback(async (idToken) => {
    const { data } = await api.post("/auth/google", { idToken });
    persistSession(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cubicnotes_token");
    localStorage.removeItem("cubicnotes_user");
    setUser(null);
    window.location.href = "/";
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem("cubicnotes_user", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleDisconnected = () => {
      updateUser({ googleCalendarConnected: false });
    };
    window.addEventListener("calendar-disconnected", handleDisconnected);
    return () => window.removeEventListener("calendar-disconnected", handleDisconnected);
  }, [updateUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, resendOtp, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
