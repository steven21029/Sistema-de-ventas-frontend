import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import PurchaseSteps from "../components/checkout/PurchaseSteps";
import { getPago, iniciarPago } from "../services/pagoService";
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

function PaymentPage({ hasDelivery, onContinueShopping, onNavigatePayment, reference }) {
  const [payment, setPayment] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadPayment() {
      setIsLoading(true);
      setFeedback("");

      try {
        const payload = await getPago(reference);
        if (isActive) {
          setPayment(payload);
          if (payload?.estado === "aprobado") {
            clearPaymentContext(reference);
          }
        }
      } catch (error) {
        if (isActive) {
          setFeedback(
            getApiErrorMessage(error, "No se pudo consultar este intento de pago."),
          );
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
          if (payload?.estado === "aprobado") {
            clearPaymentContext(reference);
          }
        }
      } catch {
        // La consulta manual sigue disponible si una actualizacion temporal falla.
      }
    }, 8000);

    return () => {
      isActive = false;
      window.clearInterval(refreshTimer);
    };
  }, [payment?.estado, reference]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setFeedback("");

    try {
      const payload = await getPago(reference);
      setPayment(payload);
      if (payload?.estado === "aprobado") {
        clearPaymentContext(reference);
      }
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "No se pudo actualizar el estado del pago."));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRetry() {
    const context = getPaymentContext(reference);

    if (!context?.pedidoId) {
      setFeedback("No se encontro el pedido asociado para volver a intentar el pago.");
      return;
    }

    setIsRetrying(true);
    setFeedback("");

    try {
      const nextPayment = await iniciarPago(context.pedidoId);
      savePaymentContext(nextPayment.referencia, context);
      clearPaymentContext(reference);
      onNavigatePayment(nextPayment.referencia);
    } catch (error) {
      setFeedback(getApiErrorMessage(error, "No se pudo crear un nuevo intento de pago."));
    } finally {
      setIsRetrying(false);
    }
  }

  const status = PAYMENT_STATUS[payment?.estado] || PAYMENT_STATUS.pendiente;
  const StatusIcon = status.icon;
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
                <h1 id="payment-title">{status.label}</h1>
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
                  Proveedor
                </dt>
                <dd>{payment.proveedor}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={17} aria-hidden="true" />
                  Actualizacion
                </dt>
                <dd>{formatDate(payment.fecha_actualizacion)}</dd>
              </div>
            </dl>

            {feedback && (
              <div className={styles.feedback} role="alert">
                {feedback}
              </div>
            )}

            <div className={styles.paymentActions}>
              {payment.estado === "pendiente" && paymentUrl && (
                <a href={paymentUrl} rel="noreferrer" className={styles.providerButton}>
                  Continuar con el proveedor
                  <ExternalLink size={18} aria-hidden="true" />
                </a>
              )}
              {payment.estado === "pendiente" && (
                <button
                  className={paymentUrl ? styles.secondaryButton : styles.providerButton}
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    size={18}
                    className={isRefreshing ? styles.spinningIcon : ""}
                    aria-hidden="true"
                  />
                  {isRefreshing ? "Actualizando" : "Actualizar estado"}
                </button>
              )}
              {payment.estado === "rechazado" && (
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
              El monto y el estado provienen directamente del pedido.
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
