import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import AppLayout from "./components/Layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotesPage from "./pages/NotesPage";
import NotebooksPage from "./pages/NotebooksPage";
import NotebookWorkspace from "./pages/NotebookWorkspace";
import TasksPage from "./pages/TasksPage";
import RemindersPage from "./pages/RemindersPage";
import SettingsPage from "./pages/SettingsPage";
import TrashBinPage from "./pages/TrashBinPage";

import { useEffect } from "react";
import { requestNotificationPermission, setupPushNotifications } from "./utils/notifications";

/** Keeps a logged-in user from seeing the login screen again. */
const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (user) {
      setupPushNotifications();
    }
  }, [user]);

  // Wait for auth rehydration before rendering anything
  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      {/* AppLayout is now accessible to both authenticated and ghost users */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="notebooks" element={<NotebooksPage />} />
        <Route path="notebooks/:notebookId" element={<NotebookWorkspace />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="bin" element={<TrashBinPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;