export const PHONE_LENGTH = 8;
export const PHONE_PATTERN = "[0-9]{8}";

export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const localDigits =
    digits.length > PHONE_LENGTH && digits.startsWith("504")
      ? digits.slice(3)
      : digits;

  return localDigits.slice(0, PHONE_LENGTH);
}
