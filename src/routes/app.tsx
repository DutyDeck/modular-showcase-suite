import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("oneedu.auth.user");
      if (!raw) throw redirect({ to: "/login" });
    }
  },
  component: AppShell,
});
