import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useCollection } from "@/lib/store";
import { brandingKey, PLATFORM_LANDING_KEY } from "@/lib/mockData";
import { applyBrandColor, clearBrandColor, type BrandTheme } from "@/lib/branding";

/**
 * Applies the logged-in user's institute brand colour to the theme's CSS
 * variables at the document root, so a licensed client's whole app wears their
 * identity. Mounted once (see __root); reacts to sign-in/out and live edits from
 * the Branding page. Falls back to the neutral 1StudentID theme when the tenant
 * has no branding or no colour set.
 */
export function BrandingLayer() {
  const { user } = useAuth();
  const brandings = useCollection("institutionBrandings");
  // Signed in → the user's institute brand; signed out → the public landing brand.
  const key = user ? brandingKey(user) : PLATFORM_LANDING_KEY;
  const branding = key ? brandings.find((b) => b.institution === key) : undefined;
  const color = branding?.brandColor;
  const theme = (branding?.brandTheme ?? "solid") as BrandTheme;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (color) applyBrandColor(root, color, theme);
    else clearBrandColor(root);
    return () => clearBrandColor(root);
  }, [color, theme]);

  return null;
}
