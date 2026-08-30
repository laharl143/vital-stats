// Mirrors the client-side bounds and category thresholds in
// src/app/book-consult/page.tsx (HEIGHT_CM_MIN/MAX, WEIGHT_KG_MIN/MAX,
// getBMICategory) so the server enforces the same rules the form already
// clamps to, instead of trusting client-supplied height/weight/bmi values.
export const HEIGHT_CM_MIN = 50;
export const HEIGHT_CM_MAX = 250;
export const WEIGHT_KG_MIN = 20;
export const WEIGHT_KG_MAX = 300;

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 23) return "Normal";
  if (bmi < 25) return "Overweight";
  if (bmi < 30) return "Obese Class I";
  return "Obese Class II";
}

// Returns null when height/weight aren't numeric or fall outside the
// client's allowed range — callers should treat that as a validation
// failure rather than falling back to unvalidated input.
export function computeBmi(
  heightCm: unknown,
  weightKg: unknown
): { bmi: string; bmiCategory: string } | null {
  const height = Number(heightCm);
  const weight = Number(weightKg);

  if (
    !Number.isFinite(height) ||
    height < HEIGHT_CM_MIN ||
    height > HEIGHT_CM_MAX ||
    !Number.isFinite(weight) ||
    weight < WEIGHT_KG_MIN ||
    weight > WEIGHT_KG_MAX
  ) {
    return null;
  }

  const bmi = parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1));
  return { bmi: bmi.toString(), bmiCategory: getBMICategory(bmi) };
}
