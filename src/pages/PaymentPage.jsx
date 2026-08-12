import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Mail,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import PurchaseSteps from "../components/checkout/PurchaseSteps";
import {
  descargarPrefactura,
  getPago,
  iniciarPago,
  reenviarPrefactura,
} from "../services/pagoService";
import { getApiErrorMessage } from "../utils/apiError";
import { formatMoney } from "../utils/money";
import {
  clearPaymentContext,
  getPaymentContext,
  savePaymentContext,
} from "../utils/paymentContext";
import styles from "./CheckoutPages.module.css";

const PAYMENT_STATUS = {
  aprobado: {
    icon: CheckCircle2,
    label: "Pago confirmado",
    tone: "approved",
  },
  pendiente: {
    icon: Clock3,
    label: "Pago pendiente",
    tone: "pending",
  },
  rechazado: {
    icon: XCircle,
    label: "Pago rechazado",
    tone: "rejected",
  },
};

function formatDate(value) {
  if (!value) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isBranchPayment(payload, context) {
  return (
    payload?.metodo === "sucursal" ||
    payload?.proveedor === "sucursal" ||
    context?.metodoPago === "sucursal"
  );
}

function getPaymentOrderId(payload, context) {
  const orderValue = payload?.pedido;
  return (
    context?.pedidoId ||
    payload?.pedido_id ||
    (typeof orderValue === "object" ? orderValue?.id : orderValue) ||
    null
  );
}

function saveFile(blob, filename) {
  const safeFilename = String(filename || "prefactura.pdf").replace(
    /[\\/:*?"<>|]/g,
    "-",
  );
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function PaymentPage({
  canPayOnline,
  hasDelivery,
  onContinueShopping,
  onNavigatePayment,
  reference,
}) {
  const [payment, setPayment] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [feedbackTone, setFeedbackTone] = useState("error");

  useEffect(() => {
    let isActive = true;

    async function loadPayment() {
      setIsLoading(true);
      setFeedback("");
      setFeedbackTone("error");

      try {
        const payload = await getPago(reference);
        if (isActive) {
          setPayment(payload);
          const context = getPaymentContext(reference);
          if (payload?.estado === "aprobado" && !isBranchPayment(payload, context)) {
            clearPaymentContext(reference);
          }
        }
      } catch (error) {
        if (isActive) {
          setFeedback(
            getApiErrorMessage(error, "No se pudo consultar este intento de pago."),
          );
          setFeedbackTone("error");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadPayment();

    return () => {
      isActive = false;
    };
  }, [reference]);

  useEffect(() => {
    if (payment?.estado !== "pendiente") {
      return undefined;
    }

    let isActive = true;
    const refreshTimer = window.setInterval(async () => {
      try {
        const payload = await getPago(reference);
        if (isActive) {
          setPayment(payload);
          const context = getPaymentContext(reference);
          if (payload?.estado === "aprobado" && !isBranchPayment(payload, context)) {
            clearPaymentContext(reference);
          }
        }
      } catch {
        // Conserva el estado actual si una consulta temporal falla.
      }
    }, 8000);

    return () => {
      isActive = false;
      window.clearInterval(refreshTimer);
    };
  }, [payment?.estado, reference]);

  async function handleRetry() {
    if (!canPayOnline) {
      setFeedback("El pago en linea no esta disponible para esta empresa.");
      setFeedbackTone("error");
      return;
    }

    const context = getPaymentContext(reference);

    if (!context?.pedidoId) {
      setFeedback("No se encontro el pedido asociado para volver a intentar el pago.");
      setFeedbackTone("error");
      return;
    }

    setIsRetrying(true);
    setFeedback("");
    setFeedbackTone("error");

    try {
      const nextPayment = await iniciarPago(context.pedidoId);
      savePaymentContext(nextPayment.referencia, context);
      clearPaymentContext(reference);
      onNavigatePayment(nextPayment.referencia);
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "No se pudo crear un nuevo intento de pago."));
      setFeedbackTone("error");
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleDownloadPrefactura() {
    const context = getPaymentContext(reference);
    const pedidoId = getPaymentOrderId(payment, context);

    if (!pedidoId) {
      setFeedback("No se encontro el pedido asociado a esta prefactura.");
      setFeedbackTone("error");
      return;
    }

    setIsDownloading(true);
    setFeedback("");
    try {
      const result = await descargarPrefactura(pedidoId);
      if (!(result.blob instanceof Blob) || result.blob.size === 0) {
        throw new Error("El servidor devolvio una prefactura vacia.");
      }
      saveFile(result.blob, result.filename || `prefactura-${pedidoId}.pdf`);
      setFeedback("Prefactura descargada correctamente.");
      setFeedbackTone("success");
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "No se pudo descargar la prefactura."));
      setFeedbackTone("error");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleResendPrefactura() {
    const context = getPaymentContext(reference);
    const pedidoId = getPaymentOrderId(payment, context);

    if (!pedidoId) {
      setFeedback("No se encontro el pedido asociado a esta prefactura.");
      setFeedbackTone("error");
      return;
    }

    setIsResending(true);
    setFeedback("");
    try {
      const result = await reenviarPrefactura(pedidoId);
      setFeedback(
        result?.correo_destino
          ? `Prefactura reenviada a ${result.correo_destino}.`
          : "Prefactura reenviada al correo verificado.",
      );
      setFeedbackTone("success");
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "No se pudo reenviar la prefactura."));
      setFeedbackTone("error");
    } finally {
      setIsResending(false);
    }
  }

  const status = PAYMENT_STATUS[payment?.estado] || PAYMENT_STATUS.pendiente;
  const StatusIcon = status.icon;
  const paymentContext = getPaymentContext(reference);
  const branchPayment = isBranchPayment(payment, paymentContext);
  const prefactura = payment?.prefactura || paymentContext?.prefactura;
  const pedidoId = getPaymentOrderId(payment, paymentContext);
  const paymentUrl = /^https?:\/\//i.test(payment?.url_pago || "")
    ? payment.url_pago
    : "";

  return (
    <section className={styles.paymentPage} aria-labelledby="payment-title">
      <button className={styles.backLink} type="button" onClick={onContinueShopping}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a la tienda
      </button>

      <PurchaseSteps
        activeStep={hasDelivery ? 3 : 2}
        hasDelivery={hasDelivery}
      />

      <div className={styles.paymentStage}>
        {isLoading ? (
          <div className={styles.paymentLoading} role="status">
            <RefreshCw size={24} className={styles.spinningIcon} aria-hidden="true" />
            Consultando pago...
          </div>
        ) : payment ? (
          <article className={styles.paymentReceipt}>
            <header className={styles.receiptHeading}>
              <div className={`${styles.statusIcon} ${styles[status.tone]}`}>
                <StatusIcon size={34} aria-hidden="true" />
              </div>
              <div>
                <p>Estado de pago</p>
                <h1 id="payment-title">
                  {branchPayment && payment.estado === "pendiente"
                    ? "Pago pendiente en sucursal"
                    : status.label}
                </h1>
                <span>Pedido {payment.pedido_numero}</span>
              </div>
            </header>

            <div className={styles.paymentAmount}>
              <span>Total del pedido</span>
              <strong>{formatMoney(payment.monto)}</strong>
              <small>{payment.moneda}</small>
            </div>

            <dl className={styles.paymentDetails}>
              <div>
                <dt>
                  <FileText size={17} aria-hidden="true" />
                  Referencia
                </dt>
                <dd>{payment.referencia}</dd>
              </div>
              <div>
                <dt>
                  <WalletCards size={17} aria-hidden="true" />
                  Forma de pago
                </dt>
                <dd>{branchPayment ? "Pago en sucursal" : payment.proveedor}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={17} aria-hidden="true" />
                  Actualizacion
                </dt>
                <dd>{formatDate(payment.fecha_actualizacion)}</dd>
              </div>
            </dl>

            {branchPayment ? (
              <div className={styles.prefacturaNotice}>
                <Building2 size={24} aria-hidden="true" />
                <div>
                  <strong>Prefactura lista para presentar</strong>
                  <span>
                    {paymentContext?.sucursalNombre
                      ? `Paga en ${paymentContext.sucursalNombre}. `
                      : ""}
                    {prefactura?.correo_enviado
                      ? `Tambien fue enviada a ${prefactura.correo_destino || "tu correo verificado"}.`
                      : "Puedes solicitar el envio a tu correo verificado."}
                  </span>
                </div>
              </div>
            ) : null}

            {feedback && (
              <div
                className={`${styles.feedback} ${feedbackTone === "success" ? styles.feedbackSuccess : ""}`}
                role={feedbackTone === "success" ? "status" : "alert"}
              >
                {feedback}
              </div>
            )}

            <div className={styles.paymentActions}>
              {payment.estado === "pendiente" && paymentUrl && !branchPayment && (
                <a href={paymentUrl} rel="noreferrer" className={styles.providerButton}>
                  Continuar con el proveedor
                  <ExternalLink size={18} aria-hidden="true" />
                </a>
              )}
              {branchPayment && pedidoId ? (
                <button
                  className={styles.providerButton}
                  disabled={isDownloading}
                  onClick={handleDownloadPrefactura}
                  type="button"
                >
                  <Download size={18} aria-hidden="true" />
                  {isDownloading ? "Descargando" : "Descargar prefactura"}
                </button>
              ) : null}
              {branchPayment && payment.estado === "pendiente" && pedidoId ? (
                <button
                  className={styles.secondaryButton}
                  disabled={isResending}
                  onClick={handleResendPrefactura}
                  type="button"
                >
                  <Mail size={18} aria-hidden="true" />
                  {isResending ? "Enviando" : "Reenviar por correo"}
                </button>
              ) : null}
              {payment.estado === "rechazado" && !branchPayment && canPayOnline && (
                <button
                  className={styles.providerButton}
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  <WalletCards size={18} aria-hidden="true" />
                  {isRetrying ? "Creando intento" : "Intentar de nuevo"}
                </button>
              )}
              {payment.estado === "aprobado" && (
                <button
                  className={styles.providerButton}
                  type="button"
                  onClick={onContinueShopping}
                >
                  <CheckCircle2 size={18} aria-hidden="true" />
                  Continuar comprando
                </button>
              )}
            </div>

            <footer className={styles.receiptFooter}>
              <ShieldCheck size={17} aria-hidden="true" />
              {branchPayment
                ? "La prefactura, el correo y el estado provienen del servidor."
                : "El monto y el estado provienen directamente del pedido."}
            </footer>
          </article>
        ) : (
          <div className={styles.paymentLoading} role="alert">
            <XCircle size={24} aria-hidden="true" />
            {feedback || "No se encontro el pago solicitado."}
          </div>
        )}
      </div>
    </section>
  );
}

export default PaymentPage;
