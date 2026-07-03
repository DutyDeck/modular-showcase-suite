import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  Shield,
  Globe2,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  CheckCircle2,
  Eye,
  EyeOff,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { tourApi } from "@/lib/tour";
import { demoUsers, SWIM_COURSE_ID } from "@/lib/mockData";
import { Avatar } from "@/components/Avatar";
import { BrandLockup } from "@/components/BrandLogo";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — 1StudentID" }] }),
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
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("demo");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const go = (em: string, pw: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    const r = login(em, pw);
    if (!r.ok) {
      setError(r.error ?? "Login failed");
      setLoading(false);
      return;
    }
    // Swim coaches land straight on their swim club — their world is the pool,
    // not the generic dashboard. The swim-club admin lands on the swim dashboard
    // (whole-club overview + quick links to coaching & reports).
    const found = demoUsers.find((u) => u.email.toLowerCase() === em.toLowerCase());
    if (found?.meta?.discipline === "Swimming" && found.role === "teacher") {
      navigate({ to: "/app/courses/$courseId", params: { courseId: SWIM_COURSE_ID } });
    } else {
      navigate({ to: "/app" });
    }
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
        <div
          className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl animate-pulse"
          style={{ animationDelay: "1.2s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
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
          <div className="inline-flex rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-white/40">
            <BrandLockup className="w-56" />
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
            A unified SaaS combining LMS, SIS, academic ERP, CRM, payments, marketplace and AI
            intelligence — built for tuition classes today, universities tomorrow.
          </p>

          {/* Feature chips */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Globe2, t: "Multi-tenant", s: "Global scale" },
              { icon: Sparkles, t: "AI-powered", s: "Predictive insights" },
              { icon: Shield, t: "Compliant", s: "GDPR · FERPA" },
            ].map(({ icon: I, t, s }) => (
              <div
                key={t}
                className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-3.5 hover:bg-white/15 transition-colors"
              >
                <I className="h-4 w-4 mb-2 opacity-90" />
                <div className="text-xs font-semibold">{t}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{s}</div>
              </div>
            ))}
          </div>

          {/* Live stats card */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-wider opacity-70 font-semibold">
                Platform pulse · live
              </div>
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
            <Avatar
              name="Dr. Rachel Hartley"
              src="https://randomuser.me/api/portraits/women/68.jpg"
              size={40}
              className="ring-2 ring-white/40"
            />
            <div className="text-[12px] leading-relaxed opacity-90">
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-300 text-amber-300" />
                ))}
              </div>
              "1StudentID replaced 6 disconnected tools and gave us insight we'd never had."
              <div className="opacity-70 mt-1 text-[11px]">
                — Dr. Rachel H., Principal · Horizon Academy
              </div>
            </div>
          </div>
        </div>

        <div className="relative text-[11px] opacity-60 flex items-center gap-4">
          <span>© 2026 1StudentID</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> SOC 2 Type II
          </span>
          <span>· 99.9% SLA</span>
        </div>
      </div>

      {/* Right form */}
      <div className="relative flex items-center justify-center p-6 lg:p-10 bg-gradient-to-br from-background via-background to-accent/30">
        {/* soft decorative blobs */}
        <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <div className="inline-flex rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
              <BrandLockup className="w-44" />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to your unified student workspace.
            </p>
          </div>

          {/* Self-running guided demo — auto-signs in and walks the whole script */}
          <button
            type="button"
            onClick={() => tourApi.start()}
            className="group mb-6 flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 p-[1.5px] shadow-soft transition-transform hover:scale-[1.01]"
          >
            <span className="flex w-full items-center gap-3 rounded-[10px] bg-card px-4 py-3 text-left">
              <PlayCircle className="h-6 w-6 shrink-0 text-indigo-500" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Start guided demo</span>
                <span className="block text-[11px] text-muted-foreground">
                  A self-running tour of every feature — you can pause anytime.
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>

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
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Forgot?
                </button>
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
                  onClick={() => setShow((s) => !s)}
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
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-11 rounded-lg bg-gradient-brand text-white font-semibold text-sm hover:opacity-95 shadow-elegant transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? "Signing you in…" : "Sign in"}
              {!loading && (
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              )}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="bg-background px-3">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  n: "Google",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.39 3.58v2.98h3.86c2.26-2.09 3.58-5.17 3.58-8.8z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-2.98c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                      />
                    </svg>
                  ),
                },
                {
                  n: "Microsoft",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path fill="#F25022" d="M1 1h10v10H1z" />
                      <path fill="#7FBA00" d="M13 1h10v10H13z" />
                      <path fill="#00A4EF" d="M1 13h10v10H1z" />
                      <path fill="#FFB900" d="M13 13h10v10H13z" />
                    </svg>
                  ),
                },
                {
                  n: "Apple",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-foreground" aria-hidden="true">
                      <path d="M17.05 12.7c-.03-2.78 2.27-4.12 2.37-4.18-1.29-1.89-3.3-2.15-4.02-2.18-1.71-.17-3.34 1.01-4.21 1.01-.87 0-2.21-.98-3.63-.96-1.87.03-3.6 1.09-4.56 2.76-1.94 3.37-.5 8.36 1.4 11.1.93 1.34 2.04 2.85 3.49 2.79 1.4-.06 1.93-.91 3.63-.91 1.69 0 2.17.91 3.65.88 1.51-.03 2.46-1.37 3.39-2.71 1.07-1.56 1.51-3.07 1.54-3.15-.03-.02-2.95-1.13-2.98-4.45zM14.28 4.57c.77-.94 1.29-2.24 1.15-3.54-1.11.05-2.46.74-3.26 1.67-.71.82-1.34 2.15-1.17 3.42 1.24.09 2.51-.63 3.28-1.55z" />
                    </svg>
                  ),
                },
                {
                  n: "SSO",
                  icon: <span className="text-xs font-bold text-primary">SSO</span>,
                },
              ].map((p) => (
                <button
                  key={p.n}
                  type="button"
                  aria-label={`Continue with ${p.n}`}
                  title={`Continue with ${p.n}`}
                  className="h-11 rounded-lg border bg-card hover:bg-muted hover:border-primary/40 transition-all shadow-soft flex items-center justify-center"
                >
                  {p.icon}
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
              {demoUsers.map((u) => {
                // Two distinct admin demo accounts (global vs institute) — call
                // them out so the difference isn't hidden behind the same word.
                const roleLabel =
                  u.role === "admin"
                    ? u.meta?.discipline === "Swimming"
                      ? "Swim admin"
                      : u.adminScope === "institute"
                        ? "Institute admin"
                        : "Global admin"
                    : u.role === "student"
                      ? u.selfManaged
                        ? "Adult student"
                        : "Student"
                      : u.role === "teacher" && u.meta?.discipline === "Swimming"
                        ? "Swim coach"
                        : u.role === "parent" && u.meta?.role === "Co-parent"
                          ? "Co-parent"
                          : u.role;
                return (
                  <button
                    key={u.id}
                    type="button"
                    disabled={loading}
                    onClick={() => quickPick(u.email)}
                    className="group relative text-left p-3 rounded-xl border bg-card hover:border-primary/50 hover:shadow-elegant transition-all overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${roleAccent[u.role]}`}
                    />
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={u.name}
                        src={u.photo}
                        size={40}
                        className="ring-2 ring-border group-hover:ring-primary/30 transition-all"
                      />
                      <div className="leading-tight min-w-0 flex-1">
                        <div className="text-xs font-semibold capitalize truncate flex items-center gap-1">
                          {roleLabel}
                          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{u.name}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 text-center text-[11px] text-muted-foreground">
            Don't have an account?{" "}
            <button className="text-primary font-semibold hover:underline">
              Request institutional access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
