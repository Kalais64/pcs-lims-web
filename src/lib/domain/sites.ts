import type { CustomerSite } from "@/lib/domain/types";

export function sitesForCustomer(sites: CustomerSite[], customerId: string | null | undefined): CustomerSite[] {
  const id = customerId?.trim();
  if (!id) return [];
  return sites.filter((site) => site.customerId === id);
}

export function firstSiteIdForCustomer(sites: CustomerSite[], customerId: string | null | undefined): string {
  return sitesForCustomer(sites, customerId)[0]?.id ?? "";
}
