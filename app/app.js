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
const promiseButton = document.querySelector("#promiseButton");
const sendAllButton = document.querySelector("#sendAllButton");
const setupAlert = document.querySelector("#setupAlert");
const setupTitle = document.querySelector("#setupTitle");
const setupMessage = document.querySelector("#setupMessage");

let invoices = [];
let selectedInvoice = null;

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
      "The app could not reach the local server status endpoint.",
    );
  }
}

async function loadInvoices() {
  const response = await fetch("/api/demo/invoices");
  const data = await response.json();
  invoices = data.invoices;
  renderInvoices();
  selectInvoice(invoices[0].id);
}

function renderInvoices() {
  invoiceList.innerHTML = invoices
    .map(
      (invoice) => `
        <button class="invoice-card" type="button" data-id="${invoice.id}">
          <div>
            <strong>${invoice.customer} - ${currency.format(invoice.amount)}</strong>
            <p>${invoice.id} - ${invoice.daysOverdue} days overdue - ${invoice.likelihood}</p>
            <p>${invoice.reason}</p>
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
}

function createDraft(invoice) {
  if (invoice.tone === "Escalated") {
    return `Hi ${invoice.contact},\n\nInvoice ${invoice.id} for ${currency.format(invoice.amount)} is now ${invoice.daysOverdue} days overdue, and the previous payment commitment was missed.\n\nPlease confirm whether payment can be completed today. If not, reply with a proposed payment plan so we can resolve the balance without further escalation.\n\nThank you,\nCollectionsAI`;
  }

  if (invoice.tone === "Firm") {
    return `Hi ${invoice.contact},\n\nI am following up on invoice ${invoice.id} for ${currency.format(invoice.amount)}, now ${invoice.daysOverdue} days overdue.\n\nPlease confirm the expected payment date today, or let me know if there is a blocker our team needs to resolve.\n\nThank you,\nCollectionsAI`;
  }

  return `Hi ${invoice.contact},\n\nHope you are doing well. I wanted to send a quick reminder that invoice ${invoice.id} for ${currency.format(invoice.amount)} is now ${invoice.daysOverdue} days overdue.\n\nCan you confirm payment timing when you have a moment?\n\nThank you,\nCollectionsAI`;
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
  sendAllButton.textContent = "37 emails queued";
  showSetupAlert(
    "Demo action queued",
    "Once Gmail or Outlook is connected, this action will create drafts or send approved follow-ups.",
  );
});

function showSetupMessageFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("setup");

  if (!provider) {
    return;
  }

  const labels = {
    qbo: "QuickBooks credentials needed",
    gmail: "Google credentials needed",
    outlook: "Microsoft credentials needed",
  };

  showSetupAlert(
    labels[provider] || "OAuth credentials needed",
    "I added the connection route, but you still need to create a developer app and add credentials before this button can connect a real account.",
  );
}

function showSetupAlert(title, message) {
  setupTitle.textContent = title;
  setupMessage.textContent = message;
  setupAlert.classList.remove("hidden");
}
