export function filterRowIndexes<T extends object>(
  rows: T[],
  searchText: string,
): number[] {
  const term = searchText.trim().toLowerCase();
  if (!term) {
    return rows.map((_, index) => index);
  }

  return rows.reduce<number[]>((indexes, row, index) => {
    const matches = Object.values(row).some((value) =>
      String(value ?? '').toLowerCase().includes(term),
    );
    if (matches) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}
