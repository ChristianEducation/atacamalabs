import site from "@/lib/content";
import { agentsOffer } from "@/lib/agents-offer";
import { NavigationHeader } from "@/components/NavigationHeader";

export function SiteHeader() {
  const portal = agentsOffer.navigation.clientPortal;
  let clientUrl: string | null = null;
  if (portal.brandVerified && portal.status === "READY" && portal.url) {
    try {
      if (new URL(portal.url).protocol === "https:") clientUrl = portal.url;
    } catch {
      /* Missing/invalid configuration remains omitted. */
    }
  }
  return (
    <NavigationHeader navigation={site.navigation} clientUrl={clientUrl} />
  );
}
