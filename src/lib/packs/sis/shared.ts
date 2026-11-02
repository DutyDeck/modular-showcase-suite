/* ── SIS completion — shared contracts ──────────────────────────────────────
 * Cross-cutting records every SIS feature writes to:
 *   • OutboxMessage — every automated notification (email / SMS / WhatsApp /
 *     in-app) is queued here, so "automated reminders" are visible and
 *     auditable instead of being a toast. The IT Administration page shows it.
 *   • ChangeLogEntry — field-level, timestamped history of who changed what on
 *     a record (student, application, mark batch, request, account…). The
 *     Student Records "History" tab and audit exports read it.
 * Write through `notify()` / `logChange()` in ./activity.ts — never directly. */

export type Channel = "Email" | "SMS" | "WhatsApp" | "App";

export interface OutboxMessage {
  id: string;
  tenantId: string;
  at: string; // ISO timestamp queued
  channel: Channel;
  to: string; // person name (and contact in brackets if useful)
  subject: string;
  body?: string;
  /** Feature that sent it, e.g. "Fees · reminders", "Exams · invigilation". */
  source: string;
  relatedId?: string;
  status: "Queued" | "Sent" | "Failed";
}

export interface ChangeLogEntry {
  id: string;
  tenantId: string;
  /** Record type, e.g. "learner", "application", "markBatch", "request", "account". */
  entity: string;
  entityId: string;
  /** For learner-scoped history (documents, marks, requests…): the 1StudentID. */
  studentId?: string;
  field: string;
  from?: string;
  to?: string;
  by: string;
  at: string;
  reason?: string;
}

export const outbox: OutboxMessage[] = [];
export const changeLog: ChangeLogEntry[] = [];
