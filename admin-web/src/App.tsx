import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { PageLoading, Card, Button } from "./components/ui";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { PendingRestaurants } from "./pages/PendingRestaurants";
import { ReportedRestaurants } from "./pages/ReportedRestaurants";
import { ReportedReviews } from "./pages/ReportedReviews";
import { Support } from "./pages/Support";

function Gate({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) return <PageLoading />;
  if (!session) return <Navigate to="/login" replace />;

  if (!profile?.is_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <Card className="max-w-sm p-8 text-center">
          <p className="font-display text-lg font-bold text-text">Sin acceso</p>
          <p className="mt-2 text-sm text-text-soft">
            Esta cuenta no tiene permisos de administrador en El Point.
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => signOut()}>
            Cerrar sesión
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Gate>
            <Layout />
          </Gate>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="restaurantes" element={<PendingRestaurants />} />
        <Route path="reportados" element={<ReportedRestaurants />} />
        <Route path="resenas" element={<ReportedReviews />} />
        <Route path="soporte" element={<Support />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
