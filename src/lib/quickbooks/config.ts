export const QB_SCOPE = "com.intuit.quickbooks.accounting";
export const QB_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
export const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function qbClientId(): string {
  return process.env.QUICKBOOKS_CLIENT_ID!;
}

export function qbClientSecret(): string {
  return process.env.QUICKBOOKS_CLIENT_SECRET!;
}

export function qbRedirectUri(): string {
  return process.env.QUICKBOOKS_REDIRECT_URI!;
}

export function qbApiBaseUrl(): string {
  const env = process.env.QUICKBOOKS_ENVIRONMENT || "sandbox";
  return env === "production" ? "https://quickbooks.api.intuit.com" : "https://sandbox-quickbooks.api.intuit.com";
}
