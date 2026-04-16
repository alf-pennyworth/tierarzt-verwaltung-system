import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Navigation from "./components/Navigation";
import ModulesNavigation from "./components/ModulesNavigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Transcription from "./pages/Transcription";
import PatientList from "./pages/PatientList";
import PatientDetails from "./pages/PatientDetails";
import TreatmentDetails from "./pages/TreatmentDetails";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import AppointmentScheduling from "./pages/AppointmentScheduling";
import Inventory from "./pages/Inventory";
import Telemedizin from "./pages/Telemedizin";
import OwnerApp from "./pages/OwnerApp";
import Owners from "./pages/Owners";
import OwnerDetail from "./pages/OwnerDetail";
import TAMG from "./pages/TAMG";
import Settings from "./pages/Settings";
import { TAMGDashboard, AntibioticForm, BVLExport } from "./components/tamg";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Laden...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
};

const WithNavigation = ({ 
  children, 
  showNav,
  isModulesPage = false
}: { 
  children: React.ReactNode;
  showNav: boolean;
  isModulesPage?: boolean;
}) => {
  return (
    <>
      {showNav && !isModulesPage && <Navigation />}
      {showNav && isModulesPage && <ModulesNavigation />}
      {children}
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/owner/*" element={<OwnerApp />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true} isModulesPage={true}>
                  <Index />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <PatientDetails />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/treatment/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <TreatmentDetails />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transcription"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Transcription />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <PatientList />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Dashboard />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Employees />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <EmployeeDetail />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owners"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Owners />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owners/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <OwnerDetail />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Reports />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Profile />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <AppointmentScheduling />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/*"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Inventory />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/telemedizin/*"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Telemedizin />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tamg"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <TAMG />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tamg/new"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <TAMG />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tamg/export"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <TAMG />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Settings />
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
