import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Sparkles, Shield, Globe2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { demoUsers } from "@/lib/mockData";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GlobalEdu" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("student@demo.com");
  const [password, setPassword] = useState("demo");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(email, password);
    if (!r.ok) setError(r.error ?? "Login failed");
    else navigate({ to: "/app" });
  };

  const quickPick = (em: string) => {
    setEmail(em);
    setPassword("demo");
    const r = login(em, "demo");
    if (r.ok) navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left hero */}
      <div className="hidden lg:flex relative bg-gradient-hero text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 35%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg">GlobalEdu</div>
              <div className="text-xs opacity-80">Education Super App</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            One identity. <br />Every classroom. <br />
            <span className="opacity-80">Everywhere on earth.</span>
          </h1>
          <p className="opacity-85 text-sm leading-relaxed">
            A unified multi-tenant SaaS combining LMS, SIS, academic ERP, CRM, payments,
            marketplace and AI intelligence — built for tuition classes today, universities tomorrow.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Globe2, t: "Multi-tenant", s: "Global scale" },
              { icon: Sparkles, t: "AI-powered", s: "Predictive insights" },
              { icon: Shield, t: "Compliant", s: "GDPR · FERPA · SOC2" },
            ].map(({ icon: I, t, s }) => (
              <div key={t} className="rounded-lg bg-white/10 backdrop-blur p-3">
                <I className="h-4 w-4 mb-2" />
                <div className="text-xs font-semibold">{t}</div>
                <div className="text-[10px] opacity-75">{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] opacity-70">
          © 2026 GlobalEdu Ecosystem · Multi-region · 99.9% SLA
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-lg bg-gradient-brand text-white flex items-center justify-center font-bold">G</div>
            <div className="font-bold">GlobalEdu</div>
          </div>

          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your unified student workspace.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Password</label>
                <button type="button" className="text-[11px] text-primary hover:underline">Forgot?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
            )}

            <button
              type="submit"
              className="w-full h-10 rounded-md bg-gradient-brand text-white font-medium text-sm hover:opacity-95 shadow-elegant transition-opacity"
            >
              Sign in
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="bg-background px-2">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {["Google", "Microsoft", "Apple", "SSO"].map((p) => (
                <button
                  key={p}
                  type="button"
                  className="h-10 rounded-md border bg-card text-xs font-medium hover:bg-muted"
                >
                  {p}
                </button>
              ))}
            </div>
          </form>

          <div className="mt-8">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Demo accounts — one click sign in
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quickPick(u.email)}
                  className="text-left p-3 rounded-lg border bg-card hover:border-primary hover:shadow-soft transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-brand text-white flex items-center justify-center text-[10px] font-semibold">
                      {u.avatar}
                    </div>
                    <div className="leading-tight">
                      <div className="text-xs font-medium capitalize">{u.role}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              Password for all demo accounts: <code className="bg-muted px-1 rounded">demo</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
