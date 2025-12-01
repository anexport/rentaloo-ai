import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./index.css";
import App from "./App.tsx";
import i18n from "@/i18n/config";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    "Root element not found. Please ensure the HTML contains an element with id='root'"
  );
}

// Wait for i18n to initialize before rendering
const renderApp = () => {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
};

// If i18n is already initialized, render immediately
// Otherwise, wait for it to initialize
if (i18n.isInitialized) {
  renderApp();
} else {
  i18n.on("initialized", renderApp);
}
