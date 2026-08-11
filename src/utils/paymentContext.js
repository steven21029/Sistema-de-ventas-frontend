const PENDING_ORDER_PREFIX = "ventas_pending_order_v1";
const PAYMENT_CONTEXT_PREFIX = "ventas_payment_context_v1";
const CHECKOUT_DRAFT_PREFIX = "ventas_checkout_draft_v1";

function readSessionValue(key) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeSessionValue(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // El flujo continua en memoria si el navegador bloquea sessionStorage.
  }
}

function removeSessionValue(key) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // No se requiere una accion adicional si el almacenamiento esta bloqueado.
  }
}

function getPendingOrderKey(empresaSlug) {
  return `${PENDING_ORDER_PREFIX}:${String(empresaSlug).toLowerCase()}`;
}

function getPaymentContextKey(referencia) {
  return `${PAYMENT_CONTEXT_PREFIX}:${String(referencia).toLowerCase()}`;
}

function getCheckoutDraftKey(scope) {
  return `${CHECKOUT_DRAFT_PREFIX}:${String(scope).toLowerCase()}`;
}

export function getPendingOrder(empresaSlug) {
  return empresaSlug ? readSessionValue(getPendingOrderKey(empresaSlug)) : null;
}

export function savePendingOrder(empresaSlug, pedido) {
  if (empresaSlug && pedido) {
    writeSessionValue(getPendingOrderKey(empresaSlug), pedido);
  }
}

export function clearPendingOrder(empresaSlug) {
  if (empresaSlug) {
    removeSessionValue(getPendingOrderKey(empresaSlug));
  }
}

export function getCheckoutDraft(scope) {
  return scope ? readSessionValue(getCheckoutDraftKey(scope)) : null;
}

export function saveCheckoutDraft(scope, draft) {
  if (scope && draft) {
    writeSessionValue(getCheckoutDraftKey(scope), draft);
  }
}

export function clearCheckoutDraft(scope) {
  if (scope) {
    removeSessionValue(getCheckoutDraftKey(scope));
  }
}

export function getPaymentContext(referencia) {
  return referencia ? readSessionValue(getPaymentContextKey(referencia)) : null;
}

export function savePaymentContext(referencia, context) {
  if (referencia && context) {
    writeSessionValue(getPaymentContextKey(referencia), context);
  }
}

export function clearPaymentContext(referencia) {
  if (referencia) {
    removeSessionValue(getPaymentContextKey(referencia));
  }
}
