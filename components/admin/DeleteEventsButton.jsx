"use client";

// Privacy erasure: removes every logged event for one company/account. Asks first.

import { useState, useTransition } from "react";
import { deleteEventsAction } from "@/app/admin/(console)/actions";

export function DeleteEventsButton({ companyId, userId, name }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  function run() {
    if (!window.confirm(`Delete every logged event for ${name}?\n\nThis removes their sign-ins, usage and security history from the console. It can't be undone, and doesn't touch their jobs or candidates.`)) return;
    start(async () => {
      try {
        const { removed } = await deleteEventsAction({ companyId, userId });
        setMsg(`Deleted ${removed}`);
      } catch {
        setMsg("Couldn't delete");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={run} disabled={pending} className="rounded-[7px] border border-line px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-60">
        {pending ? "Deleting…" : "Delete events"}
      </button>
      {msg && <span role="status" className="text-[12px] text-muted">{msg}</span>}
    </span>
  );
}
