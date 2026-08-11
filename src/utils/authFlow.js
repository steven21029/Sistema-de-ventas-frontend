const AUTH_FLOW_STORAGE_KEY = "ventas_auth_flow_v1";
const AUTH_FLOW_MODES = new Set([
  "login",
  "recover",
  "register",
  "reset",
  "verify",
]);

export function getAuthFlow() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(AUTH_FLOW_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const flow = JSON.parse(storedValue);
    if (!flow || typeof flow !== "object" || Array.isArray(flow)) {
      return null;
    }

    return {
      ...flow,
      mode: AUTH_FLOW_MODES.has(flow.mode) ? flow.mode : "login",
    };
  } catch {
    return null;
  }
}

export function saveAuthFlow(flow) {
  if (typeof window === "undefined" || !flow) {
    return;
  }

  try {
    window.sessionStorage.setItem(AUTH_FLOW_STORAGE_KEY, JSON.stringify(flow));
  } catch {
    // El flujo continua en memoria si el navegador bloquea sessionStorage.
  }
}

export function updateAuthFlow(patch) {
  saveAuthFlow({
    ...(getAuthFlow() || {}),
    ...patch,
  });
}

export function clearAuthFlow() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(AUTH_FLOW_STORAGE_KEY);
  } catch {
    // No se requiere otra accion si el almacenamiento esta bloqueado.
  }
}
