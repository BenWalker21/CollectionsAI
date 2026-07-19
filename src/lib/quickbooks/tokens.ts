import { qbClientId, qbClientSecret, qbRedirectUri, QB_TOKEN_URL } from "./config";
import { decryptToken, encryptToken } from "./crypto";
import type { QbTokenResponse } from "./types";
import { prisma } from "@/lib/prisma";

function basicAuthHeader(): string {
  return "Basic " + Buffer.from(`${qbClientId()}:${qbClientSecret()}`).toString("base64");
}

async function requestTokens(body: URLSearchParams): Promise<QbTokenResponse> {
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`QuickBooks token request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export function exchangeCodeForTokens(code: string): Promise<QbTokenResponse> {
  return requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: qbRedirectUri(),
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<QbTokenResponse> {
  return requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

function tokenExpiry(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

export async function storeConnection(
  companyId: string,
  realmId: string,
  tokens: QbTokenResponse,
  companyName?: string,
): Promise<void> {
  const nameFields = companyName ? { externalOrgName: companyName } : {};
  await prisma.integration.upsert({
    where: { companyId_provider: { companyId, provider: "QUICKBOOKS" } },
    update: {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      status: "CONNECTED",
      expiresAt: tokenExpiry(tokens.expires_in),
      externalOrgId: realmId,
      ...nameFields,
    },
    create: {
      companyId,
      provider: "QUICKBOOKS",
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      status: "CONNECTED",
      expiresAt: tokenExpiry(tokens.expires_in),
      externalOrgId: realmId,
      ...nameFields,
    },
  });
}

export async function getConnection(companyId: string) {
  return prisma.integration.findUnique({
    where: { companyId_provider: { companyId, provider: "QUICKBOOKS" } },
  });
}

export async function deleteConnection(companyId: string): Promise<void> {
  await prisma.integration.deleteMany({
    where: { companyId, provider: "QUICKBOOKS" },
  });
}

export async function getValidAccessToken(companyId: string): Promise<{ accessToken: string; realmId: string } | null> {
  const connection = await getConnection(companyId);
  if (!connection || !connection.externalOrgId) return null;

  const expiresInMs = connection.expiresAt ? connection.expiresAt.getTime() - Date.now() : 0;
  if (expiresInMs > 60_000) {
    return { accessToken: decryptToken(connection.accessToken), realmId: connection.externalOrgId };
  }

  try {
    const refreshed = await refreshAccessToken(decryptToken(connection.refreshToken));
    await storeConnection(companyId, connection.externalOrgId, refreshed);
    return { accessToken: refreshed.access_token, realmId: connection.externalOrgId };
  } catch (error) {
    await prisma.integration.update({
      where: { companyId_provider: { companyId, provider: "QUICKBOOKS" } },
      data: { status: "TOKEN_EXPIRED" },
    });
    throw error;
  }
}
