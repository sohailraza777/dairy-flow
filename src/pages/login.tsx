import * as React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Droplets,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Activity,
  Leaf,
  Sun,
} from "lucide-react";
import { useAuth, friendlyAuthError } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, loading: authLoading, login, resetPassword } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetSubmitting, setResetSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && user) navigate("/");
  }, [authLoading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password, );
      toast({ title: "Welcome back", description: "You're signed in." });
      navigate("/");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!resetEmail.trim()) return;
    setResetSubmitting(true);
    try {
      await resetPassword(resetEmail.trim());
      toast({
        title: "Reset link sent",
        description: "Check your inbox for instructions.",
      });
      setResetOpen(false);
      setResetEmail("");
    } catch (err) {
      toast({
        title: "Couldn't send reset email",
        description: friendlyAuthError(err),
        variant: "destructive",
      });
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-700 text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25) 0, transparent 35%)",
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Droplets className="h-7 w-7" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">Dairy Flow</div>
              <div className="text-sm text-white/80">Smart farm management</div>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Run your dairy with calm, clear control.
            </h1>
            <p className="text-white/85 text-lg max-w-md">
              Live monitoring, herd insights, AI briefings, and one-tap atmosphere
              controls — all in a workspace built for the people who actually run
              the farm.
            </p>
            <div className="grid grid-cols-1 gap-3 max-w-md">
              {[
                { icon: Activity, text: "Live shed monitoring & auto-adjust" },
                { icon: Leaf, text: "Herd health and yield tracking" },
                { icon: Sun, text: "Solar, biogas & hydroponic insights" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-white/90">
                  <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/60">
            © {new Date().getFullYear()} Dairy Flow. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 text-primary">
            <Droplets className="h-6 w-6" />
            <span className="text-xl font-bold">Dairy Flow</span>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-bold tracking-tight" data-testid="text-login-heading">
              Welcome back
            </h2>
            <p className="text-muted-foreground">
              Sign in to your Dairy Flow workspace.
            </p>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div
                    className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    data-testid="alert-login-error"
                  >
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@farm.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetOpen(true);
                      }}
                      className="text-xs text-primary hover:underline"
                      data-testid="button-forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(Boolean(v))}
                    data-testid="checkbox-remember"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    Keep me signed in on this device
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                  data-testid="button-sign-in"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>

                <div className="text-sm text-center text-muted-foreground">
                  New to Dairy Flow?{" "}
                  <Link
                    href="/signup"
                    className="text-primary font-medium hover:underline"
                    data-testid="link-signup"
                  >
                    Create an account
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter your account email and we'll send you a link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@farm.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              data-testid="input-reset-email"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setResetOpen(false)}
              disabled={resetSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              disabled={resetSubmitting || !resetEmail.trim()}
              data-testid="button-send-reset"
            >
              {resetSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Send reset link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
