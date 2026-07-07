import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Convenience hook so components do `const { user, login } = useAuth()`
 * instead of importing useContext + AuthContext everywhere.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
