import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap, Sparkles, Shield, Globe2, ArrowRight,
  Star, Users, TrendingUp, CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { demoUsers } from "@/lib/mockData";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GlobalEdu" }] }),
  component: LoginPage,
});

const roleAccent: Record<string, string> = {
  student: "from-sky-500 to-indigo-500",
  parent: "from-emerald-500 to-teal-500",
  teacher: "from-fuchsia-500 to-purple-500",
  admin: "from-amber-500 to-orange-500",
};

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("student@demo.com");
  const [password, setPassword] = useState("demo");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const go = (em: string, pw: string) => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const r = login(em, pw);
      if (!r.ok) {
        setError(r.error ?? "Login failed");
        setLoading(false);
      } else navigate({ to: "/app" });
    }, 250);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(email, password);
  };

  const quickPick = (em: string) => {
    setEmail(em);
    setPassword("demo");
    go(em, "demo");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background overflow-hidden">
      {/* Left hero */}
      <div className="hidden lg:flex relative bg-gradient-hero text-white p-12 flex-col justify-between overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl animate-pulse" style={{ animationDelay: "1.2s" }} />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center shadow-2xl">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">GlobalEdu</div>
              <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">Education Super App</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-8 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-[11px] font-medium">
            <Sparkles className="h-3 w-3" />
            New · AI-powered insights for every classroom
          </div>
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight">
            One identity. <br />
            Every classroom. <br />
            <span className="bg-gradient-to-r from-white via-sky-100 to-fuchsia-200 bg-clip-text text-transparent">
              Everywhere on earth.
            </span>
          </h1>
          <p className="opacity-85 text-[15px] leading-relaxed">
            A unified SaaS combining LMS, SIS, academic ERP, CRM, payments,
            marketplace and AI intelligence — built for tuition classes today, universities tomorrow.
          </p>

          {/* Feature chips */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Globe2, t: "Multi-tenant", s: "Global scale" },
              { icon: Sparkles, t: "AI-powered", s: "Predictive insights" },
              { icon: Shield, t: "Compliant", s: "GDPR · FERPA" },
            ].map(({ icon: I, t, s }) => (
              <div key={t} className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-3.5 hover:bg-white/15 transition-colors">
                <I className="h-4 w-4 mb-2 opacity-90" />
                <div className="text-xs font-semibold">{t}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{s}</div>
              </div>
            ))}
          </div>

          {/* Live stats card */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">Platform pulse · live</div>
              <span className="flex items-center gap-1.5 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Online
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Users, n: "1.2M+", l: "Active learners" },
                { icon: TrendingUp, n: "248", l: "Institutions" },
                { icon: Star, n: "4.9", l: "Avg. rating" },
              ].map(({ icon: I, n, l }) => (
                <div key={l}>
                  <I className="h-3.5 w-3.5 opacity-70 mb-1.5" />
                  <div className="text-xl font-bold tracking-tight">{n}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="flex items-start gap-3 pt-1">
            <img
              src="https://api.dicebear.com/9.x/avataaars/svg?seed=Mentor&backgroundType=gradientLinear&backgroundColor=c0aede,ffd5dc"
              alt=""
              className="h-10 w-10 rounded-full ring-2 ring-white/40"
            />
            <div className="text-[12px] leading-relaxed opacity-90">
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-300 text-amber-300" />
                ))}
              </div>
              "GlobalEdu replaced 6 disconnected tools and gave us insight we'd never had."
              <div className="opacity-70 mt-1 text-[11px]">— Dr. Anjali R., Principal · Horizon Academy</div>
            </div>
          </div>
        </div>

        <div className="relative text-[11px] opacity-60 flex items-center gap-4">
          <span>© 2026 GlobalEdu</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> SOC 2 Type II</span>
          <span>· 99.9% SLA</span>
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center p-6 lg:p-10 bg-gradient-to-br from-background via-background to-accent/30">
        {/* soft decorative blobs */}
        <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center font-bold shadow-elegant">G</div>
            <div className="font-bold">GlobalEdu</div>
          </div>

          <div className="mb-7">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to your unified student workspace.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-lg border bg-card px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all shadow-soft"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Password</label>
                <button type="button" className="text-[11px] text-primary hover:underline font-medium">Forgot?</button>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border bg-card px-3.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all shadow-soft"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
              <input type="checkbox" defaultChecked className="rounded border-input" />
              Keep me signed in on this device
            </label>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-11 rounded-lg bg-gradient-brand text-white font-semibold text-sm hover:opacity-95 shadow-elegant transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Signing you in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="bg-background px-3">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { n: "Google", c: "text-[#4285F4]" },
                { n: "Microsoft", c: "text-[#00A4EF]" },
                { n: "Apple", c: "text-foreground" },
                { n: "SSO", c: "text-primary" },
              ].map((p) => (
                <button
                  key={p.n}
                  type="button"
                  className="h-11 rounded-lg border bg-card text-xs font-semibold hover:bg-muted hover:border-primary/40 transition-all shadow-soft"
                >
                  <span className={p.c}>{p.n === "SSO" ? "SSO" : p.n[0]}</span>
                </button>
              ))}
            </div>
          </form>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Demo accounts
              </div>
              <div className="text-[10px] text-muted-foreground">
                pwd: <code className="bg-muted px-1.5 py-0.5 rounded font-mono">demo</code>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {demoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => quickPick(u.email)}
                  className="group relative text-left p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-elegant transition-all overflow-hidden"
                >
                  <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${roleAccent[u.role]}`} />
                  <div className="flex items-center gap-2.5">
                    <img
                      src={u.photo}
                      alt={u.name}
                      className="h-10 w-10 rounded-full ring-2 ring-border group-hover:ring-primary/30 bg-muted object-cover transition-all"
                    />
                    <div className="leading-tight min-w-0 flex-1">
                      <div className="text-xs font-semibold capitalize truncate flex items-center gap-1">
                        {u.role}
                        <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{u.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center text-[11px] text-muted-foreground">
            Don't have an account?{" "}
            <button className="text-primary font-semibold hover:underline">Request institutional access</button>
          </div>
        </div>
      </div>
    </div>
  );
}
