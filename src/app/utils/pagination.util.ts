export type PaginationFooterItem =
  | { kind: 'page'; page: number }
  | { kind: 'ellipsis' }
  | { kind: 'last' };

/**
 * Builds compact footer items like: 1, 2, 3, 4, 5, ……, 24, 25, Last
 * When the user is in the middle of the range, the window shifts around currentPage.
 */
export function buildPaginationFooterItems(
  totalPages: number,
  currentPage = 1,
): PaginationFooterItem[] {
  if (totalPages <= 0) {
    return [];
  }

  const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);

  if (totalPages === 1) {
    return [{ kind: 'page', page: 1 }];
  }

  if (totalPages <= 7) {
    const items: PaginationFooterItem[] = [];
    for (let page = 1; page < totalPages; page += 1) {
      items.push({ kind: 'page', page });
    }
    items.push({ kind: 'last' });
    return items;
  }

  const items: PaginationFooterItem[] = [];
  const headEnd = Math.min(5, totalPages - 1);
  const tailStart = totalPages - 2;
  const nearStart = safeCurrent <= 4;
  const nearEnd = safeCurrent >= totalPages - 3;

  if (nearStart) {
    for (let page = 1; page <= headEnd; page += 1) {
      items.push({ kind: 'page', page });
    }

    if (tailStart > headEnd + 1) {
      items.push({ kind: 'ellipsis' });
    }

    for (let page = Math.max(headEnd + 1, tailStart); page < totalPages; page += 1) {
      items.push({ kind: 'page', page });
    }
  } else if (nearEnd) {
    items.push({ kind: 'page', page: 1 });

    if (tailStart > 2) {
      items.push({ kind: 'ellipsis' });
    }

    for (let page = Math.max(2, tailStart); page < totalPages; page += 1) {
      items.push({ kind: 'page', page });
    }
  } else {
    items.push({ kind: 'page', page: 1 });
    items.push({ kind: 'ellipsis' });

    for (let page = safeCurrent - 1; page <= safeCurrent + 1; page += 1) {
      items.push({ kind: 'page', page });
    }

    if (safeCurrent + 1 < totalPages - 1) {
      items.push({ kind: 'ellipsis' });
    }

    items.push({ kind: 'page', page: totalPages - 1 });
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
