import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider } from "@/hooks/use-auth";
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
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route component={ProtectedApp} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      {/* --- DEBUG MESSAGE START --- */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        background: 'yellow', 
        color: 'black', 
        textAlign: 'center', 
        padding: '10px', 
        zIndex: 9999,
        fontWeight: 'bold',
        borderBottom: '2px solid black'
      }}>
        DEBUG: The Dashboard App is Mounted (React is working!)
      </div>
      {/* --- DEBUG MESSAGE END --- */}

      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;