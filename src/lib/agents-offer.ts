import { validDemoUrl } from "@/lib/demo-config";
export { validDemoUrl } from "@/lib/demo-config";
import offer from "@/content/agents-offer.json";

export const agentsOffer = offer;
export function getAgentPlan(id?: string) {
  return offer.pricing.plans.find((plan) => plan.id === id);
}
type SeedPricing = typeof offer.pricing;
type SeedPlan = SeedPricing["plans"][number];
export type AgentPricing = Omit<
  SeedPricing,
  | "plans"
  | "agentAdditionalPrice"
  | "agentAdditionalPeriod"
  | "promoTerms"
  | "taxTreatment"
> & {
  agentAdditionalPrice: number | null;
  agentAdditionalPeriod: string | null;
  promoTerms: string | null;
  taxTreatment: string | null;
  plans: (Omit<
    SeedPlan,
    | "monthlyPrice"
    | "setupPrice"
    | "promoSetupPrice"
    | "promoLabel"
    | "supportLevel"
  > & {
    monthlyPrice: number | null;
    setupPrice: number | null;
    promoSetupPrice: number | null;
    promoLabel: string | null;
    supportLevel: string | null;
  })[];
};
export function money(
  value: number | null,
  locale = "es-CL",
  currency = "CLP",
) {
  return value === null
    ? "Consultar"
    : new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
}
export type DemoSettings = {
  status: string;
  mode: string | null;
  iframeUrl: string | null;
  allowedOrigins: string[];
  brandVerified: boolean;
  dataNoticeReady: boolean;
  testEnvironmentVerified: boolean;
  dataNotice?: string | null;
};
export function demoIsReady(demo: DemoSettings) {
  return (
    demo.status === "READY" &&
    demo.mode === "iframe" &&
    demo.brandVerified &&
    demo.dataNoticeReady &&
    Boolean(demo.dataNotice) &&
    demo.testEnvironmentVerified &&
    validDemoUrl(demo.iframeUrl, demo.allowedOrigins)
  );
}
