import { createContext, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import GhostLoginModal from "../components/UI/GhostLoginModal";

export const GhostGateContext = createContext(null);

/**
 * Provides ghost-mode gating to the entire app.
 *
 * `guardAction(fn)` — if the user is authenticated, runs `fn` immediately.
 * If not, opens the login prompt modal instead. The action is NOT replayed
 * after login — the user simply clicks the button again naturally.
 *
 * `isGhost` — true when no authenticated user session exists.
 */
export const GhostGateProvider = ({ children }) => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const isGhost = !user;

  const guardAction = useCallback(
    (fn) => {
      if (user) {
        fn();
      } else {
        setModalOpen(true);
      }
    },
    [user]
  );

  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <GhostGateContext.Provider value={{ guardAction, isGhost }}>
      {children}
      {modalOpen && <GhostLoginModal onClose={closeModal} />}
    </GhostGateContext.Provider>
  );
};
