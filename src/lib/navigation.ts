/* The one navigation list a signed-in user sees — shared by the sidebar and the
 * command palette so both offer exactly the same destinations: the composed
 * menu (role × experience × packs), minus modules the tenant hasn't enabled
 * and pages the global admin has hidden for the demo. */
import { useAuth } from "./auth";
import { menuForUser, type MenuItem } from "./menus";
import { useEnabledModules } from "./modules";
import { useTenantContext } from "./packs/registry";
import { useCollection } from "./store";

export function useNavItems(): MenuItem[] {
  const { user } = useAuth();
  const enabled = useEnabledModules(user?.institution ?? "");
  const tenantCtx = useTenantContext();
  const demoAll = useCollection("demoSettings");
  if (!user) return [];
  const hiddenNav = demoAll.find((s) => s.id === "demo")?.hiddenNav ?? [];
  return menuForUser(user, {
    experience: tenantCtx.profile?.experience ?? "classic",
    packs: tenantCtx.packs,
    familyOperated: tenantCtx.familyOperated,
    graduated: tenantCtx.graduated,
  }).filter(
    (item) => (!item.moduleId || enabled.has(item.moduleId)) && !hiddenNav.includes(item.to),
  );
}
