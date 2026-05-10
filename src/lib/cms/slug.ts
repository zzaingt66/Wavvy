export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildUniqueSlug(base: string, existing: Set<string>): string {
  const clean = slugify(base);
  if (!existing.has(clean)) {
    return clean;
  }

  let i = 2;
  while (existing.has(`${clean}-${i}`)) {
    i += 1;
  }
  return `${clean}-${i}`;
}
