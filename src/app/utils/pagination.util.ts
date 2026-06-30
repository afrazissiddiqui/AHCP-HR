export type PaginationFooterItem =
  | { kind: 'page'; page: number }
  | { kind: 'ellipsis' }
  | { kind: 'last' };

/**
 * Builds compact footer items like: 1, 2, 3, 4, 5, ……, 12, 13, Last
 */
export function buildPaginationFooterItems(totalPages: number): PaginationFooterItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages === 1) {
    return [{ kind: 'page', page: 1 }];
  }

  const items: PaginationFooterItem[] = [];
  const headEnd = Math.min(5, totalPages - 1);

  for (let page = 1; page <= headEnd; page += 1) {
    items.push({ kind: 'page', page });
  }

  if (totalPages <= 5) {
    items.push({ kind: 'last' });
    return items;
  }

  const tailStart = totalPages - 2;

  if (tailStart > headEnd + 1) {
    items.push({ kind: 'ellipsis' });
  }

  for (let page = Math.max(headEnd + 1, tailStart); page < totalPages; page += 1) {
    items.push({ kind: 'page', page });
  }

  items.push({ kind: 'last' });
  return items;
}

export function paginationItemTrack(index: number, item: PaginationFooterItem): string {
  switch (item.kind) {
    case 'page':
      return `page-${item.page}`;
    case 'ellipsis':
      return `ellipsis-${index}`;
    case 'last':
      return 'last';
  }
}
