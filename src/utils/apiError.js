function findErrorMessage(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(findErrorMessage).find(Boolean) || "";
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(findErrorMessage).find(Boolean) || "";
  }

  return "";
}

export function getApiErrorMessage(error, fallback) {
  return findErrorMessage(error?.payload) || error?.message || fallback;
}
