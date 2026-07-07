import { useContext } from "react";
import { GhostGateContext } from "../context/GhostGateContext";

/**
 * Convenience hook for ghost-mode gating.
 *
 * Usage:
 *   const { guardAction, isGhost } = useGhostGuard();
 *   <button onClick={() => guardAction(() => createNote())}>New Note</button>
 */
export const useGhostGuard = () => {
  const ctx = useContext(GhostGateContext);
  if (!ctx) throw new Error("useGhostGuard must be used within a GhostGateProvider");
  return ctx;
};
