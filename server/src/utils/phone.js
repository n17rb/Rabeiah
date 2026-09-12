export function normalizePhone(raw) {
  if (!raw) return null;

  let digits = String(raw).replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = "962" + digits.slice(1);
  }

  if (!digits.startsWith("962") && digits.length === 9) {
    digits = "962" + digits;
  }

  return digits;
}

export function formatPhoneForDisplay(normalized) {
  if (!normalized) return "";
  if (normalized.startsWith("962")) {
    return "0" + normalized.slice(3);
  }
  return normalized;
}
