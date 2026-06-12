import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = resolve(".");

loadLocalEnv();

const PORT = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const oauthProviders = {
  qbo: {
    label: "QuickBooks Online",
    connectPath: "/api/qbo/connect",
    callbackPath: "/api/qbo/callback",
    missing: ["QBO_CLIENT_ID", "QBO_CLIENT_SECRET"],
    authorizationUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    scope: "com.intuit.quickbooks.accounting openid profile email",
  },
  gmail: {
    label: "Gmail",
    connectPath: "/api/gmail/connect",
    callbackPath: "/api/gmail/callback",
    missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope:
      "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send",
  },
  outlook: {
    label: "Outlook",
    connectPath: "/api/outlook/connect",
    callbackPath: "/api/outlook/callback",
    missing: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access Mail.ReadWrite Mail.Send User.Read",
  },
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", publicBaseUrl());

    if (url.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true, app: "CollectionsAI" });
    }

    if (url.pathname === "/api/connections/status") {
      return sendJson(response, 200, providerStatus());
    }

    if (url.pathname === "/api/demo/invoices") {
      return sendJson(response, 200, demoInvoices());
    }

    if (url.pathname.endsWith("/connect")) {
      const provider = providerFromPath(url.pathname);
      if (provider) {
        return startOAuth(provider, response);
      }
    }

    if (url.pathname.endsWith("/callback")) {
      const provider = providerFromPath(url.pathname);
      if (provider) {
        return finishOAuth(provider, url, response);
      }
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    return sendJson(response, 500, {
      error: "server_error",
      message: "Something went wrong while handling the request.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`CollectionsAI running at http://localhost:${PORT}`);
});

function loadLocalEnv() {
  const envPath = join(ROOT, ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = trimmed.indexOf("=");

    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function publicBaseUrl() {
  return process.env.APP_BASE_URL || `http://localhost:${PORT}`;
}

function providerStatus() {
  return Object.fromEntries(
    Object.entries(oauthProviders).map(([key, provider]) => [
      key,
      {
        label: provider.label,
        configured: missingEnv(provider).length === 0,
        connected: false,
        connectPath: provider.connectPath,
        missingEnv: missingEnv(provider),
      },
    ]),
  );
}

function missingEnv(provider) {
  return provider.missing.filter((key) => !process.env[key]);
}

function providerFromPath(pathname) {
  return Object.entries(oauthProviders).find(([, provider]) =>
    pathname.startsWith(provider.connectPath.replace("/connect", "")),
  );
}

function startOAuth(providerEntry, response) {
  const [key, provider] = providerEntry;
  const missing = missingEnv(provider);

  if (missing.length > 0) {
    return redirect(response, `/app/?setup=${key}`);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = redirectUriFor(key, provider);

  if (key === "qbo") {
    const params = new URLSearchParams({
      client_id: process.env.QBO_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: provider.scope,
      state,
    });

    return redirect(response, `${provider.authorizationUrl}?${params.toString()}`);
  }

  if (key === "gmail") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: provider.scope,
      state,
    });

    return redirect(response, `${provider.authorizationUrl}?${params.toString()}`);
  }

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "query",
    scope: provider.scope,
    state,
  });

  return redirect(response, `${provider.authorizationUrl}?${params.toString()}`);
}

async function finishOAuth(providerEntry, url, response) {
  const [key, provider] = providerEntry;
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return sendHtml(
      response,
      400,
      connectionPage(provider.label, "Connection was not approved.", "Return to app"),
    );
  }

  if (!code) {
    return sendHtml(
      response,
      400,
      connectionPage(provider.label, "Missing OAuth authorization code.", "Return to app"),
    );
  }

  const missing = missingEnv(provider);

  if (missing.length > 0) {
    return sendHtml(
      response,
      400,
      connectionPage(provider.label, `Missing credentials: ${missing.join(", ")}`, "Return to app"),
    );
  }

  const tokenResult = await exchangeCodeForToken(key, provider, code);

  if (!tokenResult.ok) {
    return sendHtml(
      response,
      502,
      connectionPage(
        provider.label,
        "The provider returned an error while exchanging the authorization code.",
        "Return to app",
      ),
    );
  }

  return sendHtml(
    response,
    200,
    connectionPage(
      provider.label,
      "Connected successfully. The next backend step is storing encrypted tokens in a database.",
      "Return to app",
    ),
  );
}

async function exchangeCodeForToken(key, provider, code) {
  const redirectUri = redirectUriFor(key, provider);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (key === "qbo") {
    const auth = Buffer.from(
      `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`,
    ).toString("base64");
    headers.Authorization = `Basic ${auth}`;
  } else if (key === "gmail") {
    body.set("client_id", process.env.GOOGLE_CLIENT_ID);
    body.set("client_secret", process.env.GOOGLE_CLIENT_SECRET);
  } else {
    body.set("client_id", process.env.MICROSOFT_CLIENT_ID);
    body.set("client_secret", process.env.MICROSOFT_CLIENT_SECRET);
  }

  const tokenResponse = await fetch(provider.tokenUrl, {
    method: "POST",
    headers,
    body,
  });

  return {
    ok: tokenResponse.ok,
    status: tokenResponse.status,
  };
}

function redirectUriFor(key, provider) {
  const envMap = {
    qbo: "QBO_REDIRECT_URI",
    gmail: "GOOGLE_REDIRECT_URI",
    outlook: "MICROSOFT_REDIRECT_URI",
  };

  return process.env[envMap[key]] || `${publicBaseUrl()}${provider.callbackPath}`;
}

function connectionPage(providerLabel, message, linkText) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(providerLabel)} connection | CollectionsAI</title>
    <link rel="stylesheet" href="/app/app.css" />
  </head>
  <body class="connection-result">
    <main class="result-card">
      <p class="eyebrow">${escapeHtml(providerLabel)}</p>
      <h1>${escapeHtml(message)}</h1>
      <a class="primary-action" href="/app/">${escapeHtml(linkText)}</a>
    </main>
  </body>
</html>`;
}

function demoInvoices() {
  return {
    invoices: [
      {
        id: "INV-1042",
        customer: "Acme Supply",
        email: "ap@acmesupply.example",
        amount: 22400,
        daysOverdue: 18,
        contact: "Jordan Lee",
        likelihood: "Likely to pay",
        channel: "Email",
        priorityScore: 94,
        reason: "High balance, usually pays after second reminder, no dispute found.",
        tone: "Friendly but direct",
        promise: "No current promise",
      },
      {
        id: "INV-1088",
        customer: "Beta Logistics",
        email: "finance@betalogistics.example",
        amount: 18000,
        daysOverdue: 31,
        contact: "Morgan Patel",
        likelihood: "Needs timing confirmation",
        channel: "Email",
        priorityScore: 88,
        reason: "Large overdue balance and two unanswered reminders in the thread.",
        tone: "Firm",
        promise: "Promised payment timing last month",
      },
      {
        id: "INV-1104",
        customer: "Delta Foods",
        email: "ap@deltafoods.example",
        amount: 12700,
        daysOverdue: 45,
        contact: "Riley Chen",
        likelihood: "Call recommended",
        channel: "Call + email",
        priorityScore: 83,
        reason: "Chronic late payer with missed promise; escalation should include payment plan.",
        tone: "Escalated",
        promise: "Missed Friday commitment",
      },
    ],
  };
}

async function serveStatic(pathname, response) {
  const cleanPath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const normalized = normalize(decodeURIComponent(cleanPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(ROOT, `.${normalized}`);

  if (!filePath.startsWith(ROOT)) {
    return sendHtml(response, 403, "Forbidden");
  }

  try {
    const data = await readFile(filePath);
    const type = mimeTypes[extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });
    response.end(data);
  } catch {
    const fallback = join(ROOT, "index.html");
    const data = await readFile(fallback);
    response.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    response.end(data);
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response, status, html) {
  response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
