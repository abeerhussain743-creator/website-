export type DomainEventName =
  | "student.absent"
  | "invoice.overdue"
  | "lead.created"
  | "payment.received"
  | "test.graded"
  | "booking.created"
  | "message.inbound";

export type DomainEvent<T = Record<string, unknown>> = {
  name: DomainEventName;
  institutionId: string;
  occurredAt: string;
  payload: T;
  idempotencyKey: string;
};

export function createEvent<T extends Record<string, unknown>>(
  name: DomainEventName,
  institutionId: string,
  payload: T,
  idempotencyKey: string,
): DomainEvent<T> {
  return {
    name,
    institutionId,
    occurredAt: new Date().toISOString(),
    payload,
    idempotencyKey,
  };
}
