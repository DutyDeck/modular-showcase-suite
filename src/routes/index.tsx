import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("oneedu.auth.user");
      throw redirect({ to: raw ? "/app" : "/login" });
    }
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
