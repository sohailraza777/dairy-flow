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
  // We removed QueryClientProvider from here because it's now in main.tsx
  return (
    <TooltipProvider>
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