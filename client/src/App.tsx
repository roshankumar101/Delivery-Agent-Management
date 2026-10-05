import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AgentDetailsPage } from './pages/AgentDetailsPage';
import { AgentsPage } from './pages/AgentsPage';
import { LoginPage } from './pages/LoginPage';
import { TrashPage } from './pages/TrashPage';

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        <p role="status" className="text-sm font-medium">Checking your session…</p>
      </main>
    );
  }
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:id" element={<AgentDetailsPage />} />
        <Route path="/agents/trash" element={<TrashPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App
