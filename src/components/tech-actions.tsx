"use client";

import { useState } from "react";
import type { JobStatus } from "@/lib/plan";
import { techArriveAction, techDepartAction, techDoneAction, techNeedsMoreAction } from "@/server/actions";
import { ActionButton } from "./action-button";

/** The buttons a technician has for the job in front of them. */
export function TechActions({ id, status }: { id: string; status: JobStatus }) {
  const [note, setNote] = useState("");
  if (status === "scheduled")
    return (
      <ActionButton action={() => techDepartAction(id)} pendingLabel="Saving">
        On my way
      </ActionButton>
    );
  if (status === "en_route")
    return (
      <ActionButton action={() => techArriveAction(id)} pendingLabel="Saving">
        Arrived
      </ActionButton>
    );
  if (status !== "on_site") return null;
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`note-${id}`} className="block text-sm font-semibold text-muted">
          Note for the office (optional)
        </label>
        <textarea id={`note-${id}`} className="field mt-1" rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton action={() => techDoneAction({ id, note })} pendingLabel="Saving">
          Done
        </ActionButton>
        <ActionButton action={() => techNeedsMoreAction(id)} pendingLabel="Saving" variant="quiet">
          I need 30 more minutes
        </ActionButton>
      </div>
    </div>
  );
}
