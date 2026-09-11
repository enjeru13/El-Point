export type RestaurantReportReason =
  | "nonexistent"
  | "closed"
  | "fake_info"
  | "duplicate"
  | "other";

export const RESTAURANT_REPORT_REASONS: { key: RestaurantReportReason; label: string }[] = [
  { key: "nonexistent", label: "El local no existe" },
  { key: "closed", label: "Cerró de forma permanente" },
  { key: "fake_info", label: "Datos falsos o engañosos" },
  { key: "duplicate", label: "Está duplicado" },
  { key: "other", label: "Otro motivo" },
];

export type ReviewReportReason = "offensive" | "spam" | "false" | "other";

export const REVIEW_REPORT_REASONS: { key: ReviewReportReason; label: string }[] = [
  { key: "offensive", label: "Ofensiva o con insultos" },
  { key: "spam", label: "Spam o publicidad" },
  { key: "false", label: "Información falsa" },
  { key: "other", label: "Otro motivo" },
];

export function reasonLabel(list: { key: string; label: string }[], key: string): string {
  return list.find((r) => r.key === key)?.label ?? key;
}
