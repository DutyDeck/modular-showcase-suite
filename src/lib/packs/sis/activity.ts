/* Write helpers for the shared SIS activity records (see ./shared.ts). */
import { addItem, nextId } from "@/lib/store";
import type { ChangeLogEntry, OutboxMessage } from "./shared";

/** Queue an automated notification (shown in IT Administration → Outbox). */
export function notify(
  m: Omit<OutboxMessage, "id" | "at" | "status"> & { status?: OutboxMessage["status"] },
) {
  addItem("outbox", {
    id: nextId("MSG-", "outbox"),
    at: new Date().toISOString(),
    status: m.status ?? "Sent",
    ...m,
  });
}

/** Record a field-level change on a record (shown in Student Records → History). */
export function logChange(e: Omit<ChangeLogEntry, "id" | "at">) {
  addItem("changeLog", {
    id: nextId("CHG-", "changeLog"),
    at: new Date().toISOString(),
    ...e,
  });
}
