const PAYMENT_STATUS_LABELS = {
  aprobado: "Aprobado",
  cancelado: "Cancelado",
  pagado: "Pagado",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
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
  const status = normalizeValue(value);
  const paidAtBranch =
    status === "sin_pago" ||
    (isBranchPayment(record) && ["aprobado", "pagado"].includes(status));

  if (paidAtBranch) {
    return {
      label: "Pagadas en sucursal",
      tone: "pagado",
    };
  }

  if (isBranchPayment(record) && status === "pendiente") {
    return {
      label: "Pendiente en sucursal",
      tone: "pendiente",
    };
  }

  return {
    label: PAYMENT_STATUS_LABELS[status] || String(value || "-"),
    tone: status || "pendiente",
  };
}
