export type PaginationFooterItem =
  | { kind: 'page'; page: number }
  | { kind: 'ellipsis'; jumpTo: number }
  | { kind: 'last' };

/**
 * Builds a current-page-aware footer like:
 * - near start: 1 2 3 4 5 … 26 Last
 * - middle:     1 … 7 8 9 10 11 … 26 Last
 * - near end:   1 … 22 23 24 25 26 Last
 *
 * Ellipsis jumps to the midpoint of the skipped range so users can
 * move across large gaps without only using Next/Previous.
 */
export function buildPaginationFooterItems(
  totalPages: number,
  currentPage = 1,
): PaginationFooterItem[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages === 1) {
    return [{ kind: 'page', page: 1 }];
  }

  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const siblingCount = 2;
  const items: PaginationFooterItem[] = [];

  if (totalPages <= 7) {
    for (let page = 1; page < totalPages; page += 1) {
      items.push({ kind: 'page', page });
    }
    items.push({ kind: 'last' });
    return items;
  }

  const pageSet = new Set<number>();
  pageSet.add(1);
  pageSet.add(totalPages);

  const windowStart = Math.max(2, activePage - siblingCount);
  const windowEnd = Math.min(totalPages - 1, activePage + siblingCount);

  for (let page = windowStart; page <= windowEnd; page += 1) {
    pageSet.add(page);
  }

  // Keep a denser head when the user is still near the beginning.
  if (activePage <= siblingCount + 2) {
    for (let page = 2; page <= Math.min(totalPages - 1, siblingCount + 3); page += 1) {
      pageSet.add(page);
    }
  }

  // Keep a denser tail when the user is near the end.
  if (activePage >= totalPages - (siblingCount + 1)) {
    for (let page = Math.max(2, totalPages - (siblingCount + 2)); page <= totalPages - 1; page += 1) {
      pageSet.add(page);
    }
  }

  const pages = Array.from(pageSet).sort((a, b) => a - b);

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const previous = pages[index - 1];

    if (index > 0 && page - previous > 1) {
      items.push({
        kind: 'ellipsis',
        jumpTo: Math.floor((previous + page) / 2),
      });
    }

    if (page === totalPages) {
      continue;
    }

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
      return `ellipsis-${item.jumpTo}-${index}`;
    case 'last':
      return 'last';
  }
}
