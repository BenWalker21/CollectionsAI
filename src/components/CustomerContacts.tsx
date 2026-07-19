"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ContactRow {
  id: string;
  name: string;
  email: string;
  source: string;
}

function EditableContact({ contact }: { contact: ContactRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(contact.email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-navy-800 min-w-0">{contact.name}</span>
      <span className="text-xs text-navy-700/40 uppercase shrink-0">{contact.source}</span>
      {editing ? (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-navy-900/20 rounded px-2 py-0.5 text-sm flex-1 min-w-0"
            autoFocus
          />
          <button onClick={save} disabled={busy} className="text-navy-950 font-medium disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEmail(contact.email);
              setError(null);
            }}
            className="text-navy-700/40"
          >
            Cancel
          </button>
        </>
      ) : (
        <button onClick={() => setEditing(true)} className="text-navy-700/60 hover:text-navy-950 underline decoration-dotted">
          {contact.email || "(no email)"}
        </button>
      )}
      {error ? <span className="text-rust-600 text-xs">{error}</span> : null}
    </div>
  );
}

export function CustomerContacts({ customerId, contacts }: { customerId: string; contacts: ContactRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addContact() {
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add contact");
      }
      setName("");
      setEmail("");
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5 mt-2">
      {contacts.length === 0 && !adding ? <p className="text-sm text-navy-700/40">No contacts on file.</p> : null}
      {contacts.map((c) => (
        <EditableContact key={c.id} contact={c} />
      ))}
      {adding ? (
        <div className="flex items-center gap-2 text-sm mt-1">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-navy-900/20 rounded px-2 py-0.5 text-sm w-32"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-navy-900/20 rounded px-2 py-0.5 text-sm flex-1 min-w-0"
          />
          <button onClick={addContact} disabled={busy} className="text-navy-950 font-medium disabled:opacity-50">
            {busy ? "Adding…" : "Add"}
          </button>
          <button onClick={() => setAdding(false)} className="text-navy-700/40">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-sm text-navy-700/60 hover:text-navy-950 mt-1">
          + Add contact
        </button>
      )}
      {error ? <p className="text-rust-600 text-xs">{error}</p> : null}
    </div>
  );
}
