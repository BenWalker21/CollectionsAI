import { qbApiBaseUrl } from "./config";
import type { QbCompanyInfoResponse, QbInvoiceRecord, QbQueryResponse } from "./types";

async function qbGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${qbApiBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`QuickBooks API request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export function fetchCompanyName(accessToken: string, realmId: string): Promise<string> {
  return qbGet<QbCompanyInfoResponse>(accessToken, `/v3/company/${realmId}/companyinfo/${realmId}`).then(
    (data) => data.CompanyInfo.CompanyName,
  );
}

export async function fetchOpenInvoices(accessToken: string, realmId: string): Promise<QbInvoiceRecord[]> {
  const query = encodeURIComponent("SELECT * FROM Invoice WHERE Balance > '0'");
  const data = await qbGet<QbQueryResponse>(
    accessToken,
    `/v3/company/${realmId}/query?query=${query}&include=invoiceLink`,
  );
  return data.QueryResponse.Invoice || [];
}
