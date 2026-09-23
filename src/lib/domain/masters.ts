export type NamedActive = { id: string; isActive: boolean };

/** New-form dropdowns hide inactive rows; keep current historical ids visible. */
export function optionsForForm<T extends NamedActive>(
  rows: T[],
  keepIds: Array<string | null | undefined> = [],
): T[] {
  const keep = new Set(keepIds.filter((id): id is string => Boolean(id)));
  return rows.filter((row) => row.isActive || keep.has(row.id));
}

export function firstActiveId<T extends NamedActive>(rows: T[], fallback = ""): string {
  return rows.find((row) => row.isActive)?.id ?? fallback;
}
