export function ui5SelectStringValue(ev: Event): string {
  const target = ev.target as HTMLElement & {
    selectedOption?: { value?: string };
    value?: string;
  };
  return target.selectedOption?.value ?? target.value ?? '';
}
