import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { GhostGateProvider } from "./context/GhostGateContext";
import { ThemeProvider } from "./context/ThemeContext";

import "./assets/styles/base/theme.css";
import "./assets/styles/base/global.css";
import "./assets/styles/components/inputs.css";

import { GoogleOAuthProvider } from "@react-oauth/google";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache stale time
      refetchOnWindowFocus: false, // Turn off refetching on window focus
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <GhostGateProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </GhostGateProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);
