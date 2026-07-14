import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

/* Attach JWT to every outgoing request */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cubicnotes_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Auto-logout on 401 only when the user previously had a token (expired session).
   Ghost users (no token) never trigger a redirect — the frontend ghost gate
   handles auth prompts instead. */
api.interceptors.response.use(
  (response) => {
    if (response.headers?.["x-calendar-disconnected"] === "true") {
      window.dispatchEvent(new CustomEvent("calendar-disconnected"));
    }
    return response;
  },
  (error) => {
    if (error.response?.headers?.["x-calendar-disconnected"] === "true") {
      window.dispatchEvent(new CustomEvent("calendar-disconnected"));
    }
    if (error.response?.status === 401) {
      const hadToken = localStorage.getItem("cubicnotes_token");
      localStorage.removeItem("cubicnotes_token");
      localStorage.removeItem("cubicnotes_user");
      // Only redirect if the user was previously authenticated (token expired)
      if (hadToken && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

