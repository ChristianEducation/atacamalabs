import Script from "next/script";
import { letyWidgetId } from "@/lib/marketing/public-config";

/**
 * Widget del agente de Atacama, operado en Lety (V3.0 §6). El ID es público y
 * los dominios permitidos se configuran en el panel de Lety (atacamalabs.cl,
 * www.atacamalabs.cl y localhost). Se carga tras la hidratación (afterInteractive), sin bloquear
 * el render ni el LCP.
 */
export function LetyWidget() {
  const id = letyWidgetId();
  if (!id) return null;
  return <Script src="https://cdn.lety.ai/widget.js" data-widget-id={id} strategy="afterInteractive" />;
}
