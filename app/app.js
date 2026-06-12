const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const invoiceList = document.querySelector("#invoiceList");
const draftTitle = document.querySelector("#draftTitle");
const draftTone = document.querySelector("#draftTone");
const draftBody = document.querySelector("#draftBody");
const copyDraftButton = document.querySelector("#copyDraftButton");
const openEmailButton = document.querySelector("#openEmailButton");
const promiseButton = document.querySelector("#promiseButton");
const sendAllButton = document.querySelector("#sendAllButton");
const downloadCampaignButton = document.querySelector("#downloadCampaignButton");
const setupAlert = document.querySelector("#setupAlert");
const setupTitle = document.querySelector("#setupTitle");
const setupMessage = document.querySelector("#setupMessage");
const dropZone = document.querySelector("#dropZone");
const agingFileInput = document.querySelector("#agingFileInput");
const sampleUploadButton = document.querySelector("#sampleUploadButton");
const sampleFollowupButton = document.querySelector("#sampleFollowupButton");
const templateButton = document.querySelector("#templateButton");
const queuedMetric = document.querySelector("#queuedMetric");
const recoveredMetric = document.querySelector("#recoveredMetric");
const followupMetric = document.querySelector("#followupMetric");
const riskMetric = document.querySelector("#riskMetric");
const emailReadyMetric = document.querySelector("#emailReadyMetric");
const emailMissingMetric = document.querySelector("#emailMissingMetric");
const recoveryPanel = document.querySelector("#recovered");
const recoveryList = document.querySelector("#recoveryList");
const comparisonStatus = document.querySelector("#comparisonStatus");

const agingSnapshotKey = "collectionsai:last-aging-snapshot";

let invoices = [];
let selectedInvoice = null;
let lastComparison = null;

initialize();

async function initialize() {
  await Promise.all([loadConnectionStatus(), loadInvoices()]);
  showSetupMessageFromQuery();
}

async function loadConnectionStatus() {
  try {
    const response = await fetch("/api/connections/status");
    const status = await response.json();

    Object.entries(status).forEach(([provider, details]) => {
      const card = document.querySelector(`[data-provider="${provider}"]`);

      if (!card) {
        return;
      }

      const statusLabel = card.querySelector(".connection-status");
      statusLabel.classList.toggle("ready", details.configured);
      statusLabel.classList.toggle("needs-setup", !details.configured);
      statusLabel.textContent = details.configured
        ? "Ready for OAuth connection"
        : `Needs setup: ${details.missingEnv.join(", ")}`;
    });
  } catch {
    showSetupAlert(
      "Connection status unavailable",
      "The website demo could not reach the local server status endpoint.",
    );
  }
}

async function loadInvoices() {
  const response = await fetch("/api/demo/invoices");
  const data = await response.json();
  invoices = data.invoices;
  renderInvoices();
  updateMetrics();
  selectInvoice(invoices[0].id);
}

function renderInvoices() {
  invoiceList.innerHTML = invoices
    .map(
      (invoice) => `
        <button class="invoice-card" type="button" data-id="${invoice.id}">
          <div>
            <strong>${escapeHtml(invoice.customer)} - ${currency.format(invoice.amount)}</strong>
            <p>${escapeHtml(invoice.id)} - ${invoice.daysOverdue} days overdue - ${escapeHtml(invoice.likelihood)}</p>
            <p>${escapeHtml(invoice.reason)}</p>
            <p class="email-status">
              ${invoice.email ? `Ready for ${escapeHtml(invoice.email)}` : "Email address needed"}
              ${invoice.paymentLink ? " - payment link included" : " - payment link needed"}
            </p>
          </div>
          <span class="score-pill">${invoice.priorityScore} score</span>
        </button>
      `,
    )
    .join("");

  invoiceList.querySelectorAll(".invoice-card").forEach((card) => {
    card.addEventListener("click", () => selectInvoice(card.dataset.id));
  });
}

function selectInvoice(invoiceId) {
  selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);

  if (!selectedInvoice) {
    return;
  }

  invoiceList.querySelectorAll(".invoice-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.id === invoiceId);
  });

  draftTitle.textContent = `${selectedInvoice.customer} follow-up`;
  draftTone.textContent = selectedInvoice.tone;
  draftBody.value = createDraft(selectedInvoice);
  openEmailButton.disabled = !selectedInvoice.email;
  openEmailButton.textContent = selectedInvoice.email ? "Open email" : "Missing email";
}

function updateMetrics() {
  const queued = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const atRisk = invoices.filter((invoice) => invoice.daysOverdue >= 45 || invoice.priorityScore >= 85).length;
  const recovered = lastComparison?.recoveredTotal || 0;
  const emailReady = invoices.filter((invoice) => invoice.email).length;

  queuedMetric.textContent = currency.format(queued);
  recoveredMetric.textContent = currency.format(recovered);
  followupMetric.textContent = invoices.length;
  riskMetric.textContent = atRisk;
  emailReadyMetric.textContent = emailReady;
  emailMissingMetric.textContent = invoices.length - emailReady;
  sendAllButton.textContent = `Prepare ${invoices.length} email drafts`;
}

function createEmailSubject(invoice) {
  if (invoice.tone === "Escalated") {
    return `Action needed: overdue balance ${invoice.id}`;
  }

  if (invoice.tone === "Firm") {
    return `Payment timing needed for ${invoice.id}`;
  }

  return `Quick reminder on ${invoice.id}`;
}

function createDraft(invoice) {
  const paymentLine = invoice.paymentLink
    ? `\n\nPayment link: ${invoice.paymentLink}`
    : "\n\nIf helpful, I can resend the payment link.";

  if (invoice.tone === "Escalated") {
    return `Hi ${invoice.contact},\n\nInvoice ${invoice.id} for ${currency.format(invoice.amount)} is now ${invoice.daysOverdue} days overdue, and the previous payment commitment was missed.${paymentLine}\n\nPlease confirm whether payment can be completed today. If not, reply with a proposed payment plan so we can resolve the balance without further escalation.\n\nThank you,\nCollectionsAI`;
  }

  if (invoice.tone === "Firm") {
    return `Hi ${invoice.contact},\n\nI am following up on invoice ${invoice.id} for ${currency.format(invoice.amount)}, now ${invoice.daysOverdue} days overdue.${paymentLine}\n\nPlease confirm the expected payment date today, or let me know if there is a blocker our team needs to resolve.\n\nThank you,\nCollectionsAI`;
  }

  return `Hi ${invoice.contact},\n\nHope you are doing well. I wanted to send a quick reminder that invoice ${invoice.id} for ${currency.format(invoice.amount)} is now ${invoice.daysOverdue} days overdue.${paymentLine}\n\nCan you confirm payment timing when you have a moment?\n\nThank you,\nCollectionsAI`;
}

copyDraftButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(draftBody.value);
  copyDraftButton.textContent = "Copied";
  setTimeout(() => {
    copyDraftButton.textContent = "Copy draft";
  }, 1600);
});

promiseButton.addEventListener("click", () => {
  if (!selectedInvoice) {
    return;
  }

  promiseButton.textContent = `Promise logged for ${selectedInvoice.customer}`;
  setTimeout(() => {
    promiseButton.textContent = "Log promise";
  }, 2200);
});

sendAllButton.addEventListener("click", () => {
  sendAllButton.textContent = `${invoices.length} drafts prepared`;
  showSetupAlert(
    "Email drafts prepared",
    "Download the campaign CSV now, or connect Gmail/Outlook later to create drafts directly in the inbox.",
  );
});

openEmailButton.addEventListener("click", () => {
  if (!selectedInvoice?.email) {
    showSetupAlert(
      "Email address needed",
      "Add an Email column to the AR aging CSV so CollectionsAI can open this draft in your email client.",
    );
    return;
  }

  const mailto = new URL(`mailto:${selectedInvoice.email}`);
  mailto.searchParams.set("subject", createEmailSubject(selectedInvoice));
  mailto.searchParams.set("body", draftBody.value);
  window.location.href = mailto.toString();
});

downloadCampaignButton.addEventListener("click", () => {
  const rows = [
    ["Customer", "Email", "Payment Link", "Subject", "Body", "Amount", "Days Overdue", "Tone", "Priority Score"],
    ...invoices.map((invoice) => [
      invoice.customer,
      invoice.email || "",
      invoice.paymentLink || "",
      createEmailSubject(invoice),
      createDraft(invoice),
      invoice.amount,
      invoice.daysOverdue,
      invoice.tone,
      invoice.priorityScore,
    ]),
  ];
  downloadCsv("collectionsai-email-campaign.csv", rows);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  const [file] = event.dataTransfer.files;
  handleAgingFile(file);
});

agingFileInput.addEventListener("change", () => {
  const [file] = agingFileInput.files;
  handleAgingFile(file);
});

sampleUploadButton.addEventListener("click", () => {
  loadAgingCsv(firstSampleAgingCsv(), "sample-aging-week-1.csv");
});

sampleFollowupButton.addEventListener("click", () => {
  if (!readSavedSnapshot()) {
    saveAgingSnapshot(parseAgingCsv(firstSampleAgingCsv()), "sample-aging-week-1.csv");
  }

  loadAgingCsv(nextSampleAgingCsv(), "sample-aging-week-2.csv");
});

templateButton.addEventListener("click", () => {
  downloadCsv("collectionsai-ar-template.csv", [
    ["Customer", "Email", "Payment Link", "Current", "1 - 30", "31 - 60", "61 - 90", "91 and over", "Total"],
    [
      "Example Customer",
      "ap@example.com",
      "https://pay.example.com/invoice-1001",
      "0",
      "1000",
      "0",
      "0",
      "0",
      "1000",
    ],
  ]);
});

async function handleAgingFile(file) {
  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    showSetupAlert("CSV file needed", "Please upload an AR aging summary exported as a CSV file.");
    return;
  }

  const text = await file.text();
  loadAgingCsv(text, file.name);
}

function loadAgingCsv(csvText, fileName) {
  try {
    const parsedInvoices = parseAgingCsv(csvText);
    const previousSnapshot = readSavedSnapshot();

    if (parsedInvoices.length === 0) {
      showSetupAlert(
        "No overdue balances found",
        "The file loaded, but I could not find overdue aging bucket balances to rank.",
      );
      return;
    }

    lastComparison = previousSnapshot
      ? compareAgingSnapshots(previousSnapshot.invoices, parsedInvoices)
      : null;
    invoices = parsedInvoices;
    selectedInvoice = null;
    renderInvoices();
    renderComparison(previousSnapshot, fileName);
    updateMetrics();
    selectInvoice(invoices[0].id);
    saveAgingSnapshot(parsedInvoices, fileName);

    dropZone.classList.add("loaded");
    dropZone.querySelector("span").textContent = `${fileName} loaded`;
    dropZone.querySelector("small").textContent =
      previousSnapshot
        ? `${invoices.length} overdue customers ranked and compared with the last upload.`
        : `${invoices.length} overdue customers ranked. Upload the next summary to see payments.`;
    showSetupAlert(
      previousSnapshot ? "AR aging compared" : "AR aging baseline saved",
      previousSnapshot
        ? "The queue now shows current open balances and the recovered section shows what changed since the last upload."
        : "This upload is saved as the baseline. Upload the next AR aging summary to see what was paid or reduced.",
    );
  } catch (error) {
    showSetupAlert("Could not read CSV", error.message);
  }
}

function renderComparison(previousSnapshot, fileName) {
  if (!previousSnapshot || !lastComparison) {
    recoveryPanel.classList.add("hidden");
    recoveryList.innerHTML = "";
    comparisonStatus.textContent = "Upload another summary";
    return;
  }

  recoveryPanel.classList.remove("hidden");
  comparisonStatus.textContent = `${fileName} vs ${previousSnapshot.fileName}`;

  const groups = [
    ["paid", "Paid in full"],
    ["reduced", "Partially paid"],
    ["increased", "Balance increased"],
    ["new", "New overdue balance"],
  ];

  recoveryList.innerHTML = groups
    .map(([key, label]) => {
      const items = lastComparison[key];
      const total = items.reduce((sum, item) => sum + Math.abs(item.change), 0);

      return `
        <article class="recovery-group ${key}">
          <div>
            <span>${escapeHtml(label)}</span>
            <strong>${currency.format(total)}</strong>
          </div>
          <ul>
            ${
              items.length === 0
                ? "<li>No customers in this category</li>"
                : items
                    .map(
                      (item) => `
                        <li>
                          <span>${escapeHtml(item.customer)}</span>
                          <small>${currency.format(item.previousAmount)} -> ${currency.format(item.currentAmount)}</small>
                        </li>
                      `,
                    )
                    .join("")
            }
          </ul>
        </article>
      `;
    })
    .join("");
}

function compareAgingSnapshots(previousInvoices, currentInvoices) {
  const previousMap = mapInvoicesByCustomer(previousInvoices);
  const currentMap = mapInvoicesByCustomer(currentInvoices);
  const comparison = {
    paid: [],
    reduced: [],
    increased: [],
    new: [],
    unchanged: [],
    recoveredTotal: 0,
  };

  previousMap.forEach((previous, key) => {
    const current = currentMap.get(key);
    const currentAmount = current?.amount || 0;
    const change = currentAmount - previous.amount;
    const item = {
      customer: current?.customer || previous.customer,
      previousAmount: previous.amount,
      currentAmount,
      change,
    };

    if (!current || currentAmount === 0) {
      comparison.paid.push(item);
      comparison.recoveredTotal += previous.amount;
    } else if (currentAmount < previous.amount) {
      comparison.reduced.push(item);
      comparison.recoveredTotal += previous.amount - currentAmount;
    } else if (currentAmount > previous.amount) {
      comparison.increased.push(item);
    } else {
      comparison.unchanged.push(item);
    }
  });

  currentMap.forEach((current, key) => {
    if (!previousMap.has(key)) {
      comparison.new.push({
        customer: current.customer,
        previousAmount: 0,
        currentAmount: current.amount,
        change: current.amount,
      });
    }
  });

  ["paid", "reduced", "increased", "new"].forEach((key) => {
    comparison[key].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  });

  return comparison;
}

function mapInvoicesByCustomer(sourceInvoices) {
  const map = new Map();

  sourceInvoices.forEach((invoice) => {
    map.set(customerKey(invoice.customer), invoice);
  });

  return map;
}

function readSavedSnapshot() {
  try {
    const snapshot = localStorage.getItem(agingSnapshotKey);
    return snapshot ? JSON.parse(snapshot) : null;
  } catch {
    return null;
  }
}

function saveAgingSnapshot(sourceInvoices, fileName) {
  const snapshot = {
    fileName,
    uploadedAt: new Date().toISOString(),
    invoices: sourceInvoices.map((invoice) => ({
      customer: invoice.customer,
      email: invoice.email,
      paymentLink: invoice.paymentLink,
      amount: invoice.amount,
      daysOverdue: invoice.daysOverdue,
    })),
  };

  localStorage.setItem(agingSnapshotKey, JSON.stringify(snapshot));
}

function parseAgingCsv(csvText) {
  const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim()));

  if (rows.length < 2) {
    throw new Error("The CSV needs a header row and at least one customer row.");
  }

  const headerRowIndex = findAgingHeaderRow(rows);

  if (headerRowIndex === -1) {
    throw new Error("I could not find the AR aging header row.");
  }

  const headers = rows[headerRowIndex].map(normalizeHeader);
  const explicitCustomerIndex = findHeader(headers, ["customer", "name", "client", "company"]);
  const customerIndex = explicitCustomerIndex === -1 ? 0 : explicitCustomerIndex;
  const emailIndex = findHeader(headers, ["email", "emailaddress", "contactemail", "apemail", "billingemail"]);
  const paymentLinkIndex = findHeader(headers, [
    "paymentlink",
    "paylink",
    "invoicelink",
    "invoiceurl",
    "paymenturl",
    "payurl",
  ]);
  const totalIndex = findHeader(headers, ["total", "balance", "openbalance", "amountdue"]);
  const currentIndex = findHeader(headers, ["current"]);
  const bucketIndexes = findAgingBuckets(headers);

  if (customerIndex === -1) {
    throw new Error("I could not find a customer/name column in the AR aging CSV.");
  }

  if (bucketIndexes.length === 0 && totalIndex === -1) {
    throw new Error("I could not find aging buckets or a total balance column.");
  }

  return qboAgingRowsToInvoices(
    rows.slice(headerRowIndex + 1),
    customerIndex,
    emailIndex,
    paymentLinkIndex,
    totalIndex,
    currentIndex,
    bucketIndexes,
  )
    .filter(Boolean)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.amount - a.amount);
}

function findAgingHeaderRow(rows) {
  return rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    const hasTotal = findHeader(headers, ["total", "balance", "openbalance", "amountdue"]) !== -1;
    const hasCurrent = findHeader(headers, ["current"]) !== -1;
    const hasBucket = findAgingBuckets(headers).length > 0;

    return hasTotal && (hasCurrent || hasBucket);
  });
}

function qboAgingRowsToInvoices(
  dataRows,
  customerIndex,
  emailIndex,
  paymentLinkIndex,
  totalIndex,
  currentIndex,
  bucketIndexes,
) {
  const totalCustomerKeys = new Set(
    dataRows
      .map((row) => parseQboTotalCustomer(row[customerIndex]))
      .filter(Boolean)
      .map(customerKey),
  );
  const invoices = [];
  let currentGroup = "";

  dataRows.forEach((row, index) => {
    const rawCustomer = row[customerIndex]?.trim();

    if (!rawCustomer || /^total$/i.test(rawCustomer)) {
      return;
    }

    const totalCustomer = parseQboTotalCustomer(rawCustomer);

    if (totalCustomer) {
      invoices.push(
        agingRowToInvoice(
          row,
          index,
          customerIndex,
          emailIndex,
          paymentLinkIndex,
          totalIndex,
          currentIndex,
          bucketIndexes,
          totalCustomer,
        ),
      );
      currentGroup = "";
      return;
    }

    const rowHasAmount = rowHasAgingAmount(row, totalIndex, currentIndex, bucketIndexes);

    if (!rowHasAmount) {
      currentGroup = rawCustomer;
      return;
    }

    if (currentGroup && totalCustomerKeys.has(customerKey(currentGroup))) {
      return;
    }

    invoices.push(
      agingRowToInvoice(
        row,
        index,
        customerIndex,
        emailIndex,
        paymentLinkIndex,
        totalIndex,
        currentIndex,
        bucketIndexes,
        currentGroup || rawCustomer,
      ),
    );
  });

  return invoices;
}

function parseQboTotalCustomer(value = "") {
  const match = String(value).trim().match(/^total\s+for\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function rowHasAgingAmount(row, totalIndex, currentIndex, bucketIndexes) {
  const total = totalIndex === -1 ? 0 : parseMoney(row[totalIndex]);
  const current = currentIndex === -1 ? 0 : parseMoney(row[currentIndex]);
  const buckets = bucketIndexes.reduce((sum, bucket) => sum + parseMoney(row[bucket.index]), 0);

  return total > 0 || current > 0 || buckets > 0;
}

function agingRowToInvoice(
  row,
  index,
  customerIndex,
  emailIndex,
  paymentLinkIndex,
  totalIndex,
  currentIndex,
  bucketIndexes,
  customerOverride = "",
) {
  const customer = customerOverride || row[customerIndex]?.trim();

  if (!customer || /^total$/i.test(customer)) {
    return null;
  }

  const current = currentIndex === -1 ? 0 : parseMoney(row[currentIndex]);
  const bucketValues = bucketIndexes.map((bucket) => ({
    days: bucket.days,
    amount: parseMoney(row[bucket.index]),
  }));
  const overdue = bucketValues.reduce((sum, bucket) => sum + bucket.amount, 0);
  const total = totalIndex === -1 ? overdue + current : parseMoney(row[totalIndex]);
  const amount = overdue > 0 ? overdue : Math.max(total - current, 0);

  if (amount <= 0) {
    return null;
  }

  const oldestBucket = bucketValues
    .filter((bucket) => bucket.amount > 0)
    .sort((a, b) => b.days - a.days)[0];
  const daysOverdue = oldestBucket?.days || 15;
  const priorityScore = scoreAgingRow(amount, daysOverdue);
  const tone = toneForDays(daysOverdue);

  return {
    id: `AGE-${String(index + 1).padStart(3, "0")}`,
    customer,
    email: emailIndex === -1 ? "" : row[emailIndex]?.trim(),
    paymentLink: paymentLinkIndex === -1 ? "" : row[paymentLinkIndex]?.trim(),
    amount,
    daysOverdue,
    contact: "Accounts Payable",
    likelihood: likelihoodForDays(daysOverdue),
    channel: "Email",
    priorityScore,
    reason: `${currency.format(amount)} overdue from uploaded AR aging; oldest bucket is ${daysOverdue}+ days.`,
    tone,
    promise: "No current promise",
  };
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function findAgingBuckets(headers) {
  return headers
    .map((header, index) => {
      if (/91|90plus|over90|olderthan90/.test(header)) {
        return { index, days: 91 };
      }
      if (/61|60to90|6190/.test(header)) {
        return { index, days: 61 };
      }
      if (/31|30to60|3160/.test(header)) {
        return { index, days: 31 };
      }
      if (/1.*30|130|pastdue|overdue/.test(header) && header !== "current") {
        return { index, days: 15 };
      }
      return null;
    })
    .filter(Boolean);
}

function findHeader(headers, candidates) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
}

function normalizeHeader(header) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseMoney(value = "") {
  const normalized = String(value).replace(/[$,\s]/g, "");

  if (!normalized || normalized === "-") {
    return 0;
  }

  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    return -Number(normalized.slice(1, -1)) || 0;
  }

  return Number(normalized) || 0;
}

function scoreAgingRow(amount, daysOverdue) {
  const amountScore = Math.min(45, Math.round(amount / 1000));
  const ageScore = Math.min(45, Math.round(daysOverdue / 2));
  return Math.min(99, 35 + amountScore + ageScore);
}

function toneForDays(daysOverdue) {
  if (daysOverdue >= 61) {
    return "Escalated";
  }
  if (daysOverdue >= 31) {
    return "Firm";
  }
  return "Friendly but direct";
}

function likelihoodForDays(daysOverdue) {
  if (daysOverdue >= 61) {
    return "Escalation recommended";
  }
  if (daysOverdue >= 31) {
    return "Needs timing confirmation";
  }
  return "Likely to pay";
}

function firstSampleAgingCsv() {
  return [
    "Customer,Email,Payment Link,Current,1 - 30,31 - 60,61 - 90,91 and over,Total",
    "Acme Supply,ap@acmesupply.example,https://pay.collectionsai.example/acme-1042,1200,22400,0,0,0,23600",
    "Beta Logistics,finance@betalogistics.example,https://pay.collectionsai.example/beta-1088,0,0,18000,0,0,18000",
    "Delta Foods,ap@deltafoods.example,https://pay.collectionsai.example/delta-1104,0,0,0,0,12700,12700",
    "Harbor Retail,accounting@harborretail.example,https://pay.collectionsai.example/harbor-1120,4000,6700,0,0,0,10700",
  ].join("\n");
}

function nextSampleAgingCsv() {
  return [
    "Customer,Email,Payment Link,Current,1 - 30,31 - 60,61 - 90,91 and over,Total",
    "Acme Supply,ap@acmesupply.example,https://pay.collectionsai.example/acme-1042,1200,0,0,0,0,1200",
    "Beta Logistics,finance@betalogistics.example,https://pay.collectionsai.example/beta-1088,0,0,9000,0,0,9000",
    "Delta Foods,ap@deltafoods.example,https://pay.collectionsai.example/delta-1104,0,0,0,0,12700,12700",
    "Newport Services,billing@newportservices.example,https://pay.collectionsai.example/newport-1131,0,5600,0,0,0,5600",
  ].join("\n");
}

function customerKey(customer) {
  return customer.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function showSetupMessageFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("setup");
  const paid = params.get("paid");

  if (paid === "success") {
    showSetupAlert(
      "Payment received",
      "This is where the paid website workspace would unlock uploads, email linking, and draft creation.",
    );
    return;
  }

  if (!provider) {
    return;
  }

  const labels = {
    qbo: "QuickBooks credentials needed",
    gmail: "Google credentials needed",
    outlook: "Microsoft credentials needed",
    billing: "Stripe billing setup needed",
  };

  showSetupAlert(
    labels[provider] || "OAuth credentials needed",
    provider === "billing"
      ? "The subscription button is wired for Stripe Checkout. Add Stripe keys before taking real payments."
      : "The connection route is ready, but provider credentials are needed before this can connect a real account.",
  );
}

function showSetupAlert(title, message) {
  setupTitle.textContent = title;
  setupMessage.textContent = message;
  setupAlert.classList.remove("hidden");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
