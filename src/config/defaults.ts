export const SECTORS = {
  saas: "SaaS / Tech",
  industrie: "Industrie",
  finance: "Finance / Banque",
  immo: "Immobilier",
  rh: "RH / Recrutement",
  ecom: "E-commerce",
  conseil: "Conseil / Services",
};

export const CHANNEL_SECTOR_DEFAULTS = {
  "google-ads": {
    saas: { cpc: 8, ctr: 4, conversionRate: 3.5, budget: 5000 },
    industrie: { cpc: 3, ctr: 4, conversionRate: 2.5, budget: 3000 },
    finance: { cpc: 12, ctr: 5, conversionRate: 2, budget: 8000 },
    immo: { cpc: 4, ctr: 5, conversionRate: 3, budget: 4000 },
    rh: { cpc: 5, ctr: 4.5, conversionRate: 3, budget: 3500 },
    ecom: { cpc: 1.2, ctr: 5, conversionRate: 2.5, budget: 2000 },
    conseil: { cpc: 6, ctr: 4, conversionRate: 3, budget: 6000 },
  },
  "meta-ads": {
    saas: { cpc: 2.5, ctr: 1.5, conversionRate: 2, budget: 4000 },
    industrie: { cpc: 1.5, ctr: 1.2, conversionRate: 1.5, budget: 2000 },
    finance: { cpc: 3.5, ctr: 1.2, conversionRate: 1.5, budget: 5000 },
    immo: { cpc: 1.8, ctr: 1.8, conversionRate: 2.5, budget: 3500 },
    rh: { cpc: 2, ctr: 1.5, conversionRate: 2, budget: 2500 },
    ecom: { cpc: 0.8, ctr: 2, conversionRate: 2.5, budget: 1500 },
    conseil: { cpc: 2, ctr: 1.4, conversionRate: 2, budget: 3500 },
  },
  "linkedin-ads": {
    saas: { cpc: 10, ctr: 0.6, conversionRate: 3, budget: 8000 },
    industrie: { cpc: 9, ctr: 0.5, conversionRate: 2, budget: 5000 },
    finance: { cpc: 14, ctr: 0.5, conversionRate: 2, budget: 10000 },
    immo: { cpc: 8, ctr: 0.5, conversionRate: 2, budget: 7000 },
    rh: { cpc: 12, ctr: 0.7, conversionRate: 3, budget: 6000 },
    ecom: { cpc: 9, ctr: 0.5, conversionRate: 1.5, budget: 4500 },
    conseil: { cpc: 11, ctr: 0.6, conversionRate: 2.5, budget: 9000 },
  },
  "tiktok-ads": {
    saas: { cpc: 1.5, ctr: 1, conversionRate: 1.5, budget: 3000 },
    industrie: { cpc: 1, ctr: 0.8, conversionRate: 1, budget: 1500 },
    finance: { cpc: 2, ctr: 0.8, conversionRate: 1, budget: 3500 },
    immo: { cpc: 1.2, ctr: 1.2, conversionRate: 1.5, budget: 2500 },
    rh: { cpc: 1.3, ctr: 1, conversionRate: 1.5, budget: 2000 },
    ecom: { cpc: 0.5, ctr: 1.8, conversionRate: 2, budget: 1200 },
    conseil: { cpc: 1.4, ctr: 1, conversionRate: 1.5, budget: 2500 },
  },
};

export function getDefaultValues(channel, sector) {
  return CHANNEL_SECTOR_DEFAULTS[channel]?.[sector] ?? null;
}
