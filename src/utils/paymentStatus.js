const PAYMENT_STATUS_LABELS = {
  aprobado: "Aprobado",
  cancelado: "Cancelado",
  pagado: "Pagado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  sin_pago: "Sin confirmar",
};

const PAYMENT_METHOD_LABELS = {
  en_linea: "Pago en linea",
  pendiente: "Sin metodo elegido",
  sucursal: "Pago en sucursal",
};

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isBranchPayment(record) {
  return [record?.metodo_pago, record?.metodo, record?.proveedor]
    .map(normalizeValue)
    .includes("sucursal");
}

export function getAdminPaymentStatus(value, record = {}) {
  const rawStatus = normalizeValue(value);
  const status = rawStatus === "sin_pago" && isBranchPayment(record) ? "pagado" : rawStatus;

  return {
    label: PAYMENT_STATUS_LABELS[status] || String(value || "-"),
    tone: status || "pendiente",
  };
}

export function getAdminPaymentMethod(value) {
  const method = normalizeValue(value);

  return {
    label: PAYMENT_METHOD_LABELS[method] || String(value || "-"),
    value: method,
  };
}
