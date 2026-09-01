// Lowercases everything, then capitalizes the first letter of each word —
// same normalization the "Book a consult" form applies as the patient types
// (see capitalizeWords in src/app/book-consult/page.tsx), applied here to
// the already-combined fullName for display so older records saved before
// that normalization existed (or edited directly in the DB) still render
// consistently in the admin portal.
export function formatPatientName(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
}
