import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { AssignedTicketsPage } from './pages/AssignedTicketsPage';
import { AllTicketsPage } from './pages/AllTicketsPage';
import { CompletedTicketsPage } from './pages/CompletedTicketsPage';
import { MasterSettingsPage } from './pages/MasterSettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected App Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="new-ticket" element={<NewTicketPage />} />
              <Route path="my-tickets" element={<MyTicketsPage />} />
              <Route path="assigned-tickets" element={<AssignedTicketsPage />} />
              <Route path="all-tickets" element={<AllTicketsPage />} />
              <Route path="completed-tickets" element={<CompletedTicketsPage />} />
              <Route path="master-settings" element={<MasterSettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
