export type PaginationFooterItem =
  | { kind: 'page'; page: number }
  | { kind: 'ellipsis' }
  | { kind: 'last' };

/**
 * Builds footer items like: 1, 2, 3, 4, 5, ……, 10, 11, 12, Last
 */
export function buildPaginationFooterItems(totalPages: number): PaginationFooterItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages === 1) {
    return [{ kind: 'page', page: 1 }];
  }

  if (totalPages <= 8) {
    const items: PaginationFooterItem[] = [];
    for (let page = 1; page < totalPages; page += 1) {
      items.push({ kind: 'page', page });
    }
    items.push({ kind: 'last' });
    return items;
  }

  const items: PaginationFooterItem[] = [];
  const headEnd = 5;
  const tailStart = totalPages - 2;

  for (let page = 1; page <= headEnd; page += 1) {
    items.push({ kind: 'page', page });
  }

  if (tailStart > headEnd + 1) {
    items.push({ kind: 'ellipsis' });
  } else {
    for (let page = headEnd + 1; page < tailStart; page += 1) {
      items.push({ kind: 'page', page });
    }
  }

  for (let page = tailStart; page <= totalPages; page += 1) {
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
