import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/auth";
import Login from "@/pages/Login";
import SearchPage from "@/pages/Search";
import LogsPage from "@/pages/Logs";
import ProfilePage from "@/pages/Profile";
import ImportPage from "@/pages/Import";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null; // still loading — AppLayout will fetch user
  const isAdmin = user.role?.type === "admin" || user.role?.name === "Super Admin";
  if (!isAdmin) return <Navigate to="/search" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/search" element={<SearchPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/import"
              element={
                <AdminRoute>
                  <ImportPage />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
