/**
 * Dashboard for "segment" tenants (school / university / college). Picks the
 * pack dashboard for the tenant's institution type and the user's role.
 */
import { useTenantContext } from "@/lib/packs/registry";
import { SchoolAdminDash, SchoolTeacherDash, SchoolParentDash } from "./SchoolDash";
import { RegistrarDash, LecturerDash, HeStudentDash } from "./HeDash";

export function PackDashboard() {
  const ctx = useTenantContext();
  const role = ctx.user?.role;
  if (ctx.type === "school") {
    if (role === "teacher") return <SchoolTeacherDash />;
    if (role === "parent") return <SchoolParentDash />;
    return <SchoolAdminDash />;
  }
  if (role === "teacher") return <LecturerDash />;
  if (role === "student") return <HeStudentDash />;
  return <RegistrarDash />;
}
