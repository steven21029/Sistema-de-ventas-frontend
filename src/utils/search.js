export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function textIncludesSearch(value, normalizedSearch) {
  if (!normalizedSearch) {
    return true;
  }

  return normalizeSearchText(value).includes(normalizedSearch);
}
