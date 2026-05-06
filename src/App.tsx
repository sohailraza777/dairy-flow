import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/hooks/use-auth"; // Added useAuth import
import { ProtectedRoute } from "@/components/protected-route";
import Dashboard from "@/pages/dashboard";
import CommandCenter from "@/pages/command-center";
import Collections from "@/pages/collections";
import Customers from "@/pages/customers";
import Sales from "@/pages/sales";
import Payments from "@/pages/payments";
import Analytics from "@/pages/analytics";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";

function ProtectedApp() {
  return (
    <ProtectedRoute>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/command-center" component={CommandCenter} />
          <Route path="/collections" component={Collections} />
          <Route path="/customers" component={Customers} />
          <Route path="/sales" component={Sales} />
          <Route path="/payments" component={Payments} />
          <Route path="/analytics" component={Analytics} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </ProtectedRoute>
  );
}

function Router() {
  const { user, loading } = useAuth();

  // 1. If Firebase is still initializing, wait.
  if (loading) return null;

  // 2. If NO user is logged in, force show Auth pages
  if (!user) {
    return (
      <Switch>
        <Route path="/signup" component={Signup} />
        {/* Any other route will just show the Login page directly */}
        <Route component={Login} />
      </Switch>
    );
  }

  // 3. If user is logged in, show the Dashboard
  return <ProtectedApp />;
}

function App() {
  return (
    <TooltipProvider>
      {/* Keeping a small banner to confirm React is alive */}
      <div style={{ 
        position: 'fixed', top: 0, left: 0, width: '100%', 
        background: 'yellow', color: 'black', textAlign: 'center', 
        padding: '5px', zIndex: 9999, fontWeight: 'bold', fontSize: '12px'
      }}>
        REACT STATUS: ACTIVE
      </div>

      <AuthProvider>
        {/* Simplified Router - No complex base path logic */}
        <WouterRouter>
          <Router />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;