function findErrorMessage(value) {
  if (typeof value === "string" && value.trim()) {
    const message = value.trim().replace(/\s+/g, " ");
    const looksLikeDebugPage =
      /<(?:!doctype|html|head|body|style|script)\b/i.test(message) ||
      /(?:OperationalError|ProgrammingError|DatabaseError|IntegrityError|DataError|InterfaceError|InternalError|NotSupportedError|Traceback) at \/api\//i.test(message) ||
      /Request Method:\s*(?:GET|POST|PUT|PATCH|DELETE)/i.test(message) ||
      /(?:Django Version|Python Executable|Installed Applications|Installed Middleware|Server time):/i.test(message);

    if (looksLikeDebugPage || message.length > 500) {
      return "";
    }

    return message;
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
