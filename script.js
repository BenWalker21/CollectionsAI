const emailDrafts = {
  friendly: {
    subject: "Quick reminder on invoice INV-1042",
    body:
      "Hi Jordan, hope you're doing well. I wanted to send a quick reminder that invoice INV-1042 is now due. You can pay using the secure link below, or reply here if you need anything from our team.",
  },
  late: {
    subject: "Payment timing needed for overdue invoice INV-1042",
    body:
      "Hi Jordan, invoice INV-1042 remains unpaid after previous reminders. Please confirm the payment date today or let us know if a payment plan is needed so we can resolve the balance.",
  },
  executive: {
    subject: "Action requested: INV-1042 payment timing",
    body:
      "Jordan, invoice INV-1042 is overdue with a balance of $18,000. Please confirm payment timing or the correct finance contact for resolution.",
  },
};

const tabs = document.querySelectorAll(".email-tab");
const subject = document.querySelector("#emailSubject");
const body = document.querySelector("#emailBody");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const tone = tab.dataset.tone;
    const draft = emailDrafts[tone];

    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");

    subject.textContent = draft.subject;
    body.textContent = draft.body;
  });
});

const batchButton = document.querySelector("#sendBatchButton");
const batchStatus = document.querySelector("#sendBatchStatus");

batchButton.addEventListener("click", () => {
  batchButton.classList.add("sent");
  batchButton.textContent = "37 emails prepared";
  batchStatus.textContent = "Ready for review before sending.";
});
