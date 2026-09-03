const REFERENCE_NUMBER_TIME_ZONE = "Asia/Manila";

export function formatReferenceNumber(sequence: number, createdAt: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REFERENCE_NUMBER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(createdAt);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `VS-${year}-${month}${day}-${sequence}`;
}
