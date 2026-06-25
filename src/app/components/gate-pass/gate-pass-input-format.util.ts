/** Pakistani CNIC: XXXXX-XXXXXXX-X (13 digits). */
export function formatGatePassCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/** Mobile number: digits only, max 11. */
export function formatGatePassPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

export function gatePassPhoneDigitCount(value: string): number {
  return formatGatePassPhoneDigits(value).length;
}

export function isGatePassPhoneValid(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  return gatePassPhoneDigitCount(trimmed) === 11;
}

export function gatePassCnicDigitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}

export function isGatePassCnicValid(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  return gatePassCnicDigitCount(trimmed) === 13;
}
