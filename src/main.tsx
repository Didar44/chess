import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/features/auth/model/auth-provider";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { router } from "@/app/router";
import "@/app/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <ThemeProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ThemeProvider>,
);
