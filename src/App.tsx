import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Navigation from "./components/Navigation";
import ModulesNavigation from "./components/ModulesNavigation";
import LoadingSpinner from "./components/LoadingSpinner";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Eagerly loaded components (critical for initial render)
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded page components
const Index = lazy(() => import("./pages/Index"));
const Transcription = lazy(() => import("./pages/Transcription"));
const PatientList = lazy(() => import("./pages/PatientList"));
const PatientDetails = lazy(() => import("./pages/PatientDetails"));
const PatientHistoryPage = lazy(() => import("./pages/PatientHistoryPage"));
const TreatmentDetails = lazy(() => import("./pages/TreatmentDetails"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const Profile = lazy(() => import("./pages/Profile"));
const AppointmentScheduling = lazy(() => import("./pages/AppointmentScheduling"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Telemedizin = lazy(() => import("./pages/Telemedizin"));
const OwnerApp = lazy(() => import("./pages/OwnerApp"));
const Owners = lazy(() => import("./pages/Owners"));
const OwnerDetail = lazy(() => import("./pages/OwnerDetail"));
const TAMG = lazy(() => import("./pages/TAMG"));
const Settings = lazy(() => import("./pages/Settings"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
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
          <Route path="/owner/*" element={
            <Suspense fallback={<LoadingSpinner />}>
              <OwnerApp />
            </Suspense>
          } />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true} isModulesPage={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Index />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PatientDetails />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/treatment/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <TreatmentDetails />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transcription"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Transcription />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PatientList />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <PatientHistoryPage />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Dashboard />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Employees />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <EmployeeDetail />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owners"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Owners />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owners/:id"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <OwnerDetail />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Reports />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Profile />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <AppointmentScheduling />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/*"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Inventory />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/telemedizin/*"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Telemedizin />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tamg"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <TAMG />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tamg/new"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <TAMG />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tamg/export"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <TAMG />
                  </Suspense>
                </WithNavigation>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <WithNavigation showNav={true}>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Settings />
                  </Suspense>
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