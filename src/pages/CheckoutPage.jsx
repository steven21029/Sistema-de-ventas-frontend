import {
  ArrowLeft,
  Building2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PurchaseSteps from "../components/checkout/PurchaseSteps";
import { iniciarPago } from "../services/pagoService";
import { generarPedidoDesdeCarrito } from "../services/pedidoService";
import { getApiErrorMessage } from "../utils/apiError";
import { formatMoney, toNumber } from "../utils/money";
import {
  clearPendingOrder,
  getPendingOrder,
  savePaymentContext,
  savePendingOrder,
} from "../utils/paymentContext";
import styles from "./CheckoutPages.module.css";

function getCustomerDefaults(session) {
  const user = session?.usuario;

  return {
    nombre_recibe: [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim(),
    telefono_recibe: session?.perfil?.telefono || "",
  };
}

function getOrderItems(order) {
  return (order?.detalles || []).map((item) => ({
    cantidad: Number(item.cantidad) || 1,
    codigo: item.codigo_articulo,
    nombre: item.nombre_articulo,
    precioFinal: toNumber(item.precio_unitario_final),
  }));
}

function CheckoutPage({
  authSession,
  cartId,
  chargesTax,
  empresa,
  empresaSlug,
  isCalculating,
  isCartLoading,
  items,
  onBackToCart,
  onOrderCreated,
  onPaymentStarted,
  taxPercentage,
  totals,
}) {
  const [deliveryType, setDeliveryType] = useState(
    empresa?.tiene_envios ? "envio_local" : "retiro_en_local",
  );
  const [fields, setFields] = useState(() => ({
    ...getCustomerDefaults(authSession),
    departamento_entrega: "",
    direccion_entrega: "",
    municipio_entrega: "",
    observaciones: "",
    referencia_entrega: "",
  }));
  const [pendingOrder, setPendingOrder] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutScope = `${empresaSlug}:${authSession?.usuario?.id || ""}`;

  useEffect(() => {
    setPendingOrder(getPendingOrder(checkoutScope));
    setDeliveryType(empresa?.tiene_envios ? "envio_local" : "retiro_en_local");
    setFields((current) => ({
      ...current,
      ...getCustomerDefaults(authSession),
    }));
  }, [authSession, checkoutScope, empresa?.tiene_envios]);

  const displayItems = useMemo(
    () => (pendingOrder ? getOrderItems(pendingOrder) : items),
    [items, pendingOrder],
  );
  const displayTotals = pendingOrder
    ? {
        discount: toNumber(pendingOrder.descuento_total),
        shipping: toNumber(pendingOrder.envio),
        subtotal: toNumber(pendingOrder.subtotal),
        tax: toNumber(pendingOrder.impuesto),
        total: toNumber(pendingOrder.total),
      }
    : {
        ...totals,
        shipping: 0,
      };
  const orderChargesTax = pendingOrder ? pendingOrder.aplica_impuesto === true : chargesTax;
  const requiresAddress = deliveryType !== "retiro_en_local";
  const isBusy = isCartLoading || isCalculating || isSubmitting;
  const hasCheckoutItems = displayItems.length > 0;
  const companyPhone = String(empresa?.telefono || "88888888").trim();
  const companyPhoneHref = companyPhone.replace(/[^\d+]/g, "");

  function updateField(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function handlePay(event) {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    try {
      let order = pendingOrder;

      if (!order) {
        if (!cartId) {
          throw new Error("No se encontro un carrito activo para crear el pedido.");
        }

        order = await generarPedidoDesdeCarrito(cartId, {
          tipo_entrega: deliveryType,
          nombre_recibe: requiresAddress ? fields.nombre_recibe.trim() : "",
          telefono_recibe: requiresAddress ? fields.telefono_recibe.trim() : "",
          direccion_entrega: requiresAddress ? fields.direccion_entrega.trim() : "",
          referencia_entrega: requiresAddress ? fields.referencia_entrega.trim() : "",
          departamento_entrega: requiresAddress
            ? fields.departamento_entrega.trim()
            : "",
          municipio_entrega: requiresAddress ? fields.municipio_entrega.trim() : "",
          observaciones: empresa?.tiene_envios ? fields.observaciones.trim() : "",
        });
        setPendingOrder(order);
        savePendingOrder(checkoutScope, order);
        await onOrderCreated(order);
      }

      const payment = await iniciarPago(order.id);
      savePaymentContext(payment.referencia, {
        pedidoId: order.id,
        pedidoNumero: order.numero,
      });
      clearPendingOrder(checkoutScope);
      onPaymentStarted(payment);
    } catch (error) {
      setFeedback(
        getApiErrorMessage(
          error,
          "No se pudo preparar el pago. Revisa la informacion e intentalo nuevamente.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.checkoutPage} aria-labelledby="checkout-title">
      <PurchaseSteps activeStep={2} hasDelivery={empresa?.tiene_envios === true} />

      <button
        className={`${styles.backLink} ${styles.checkoutBackLink}`}
        type="button"
        onClick={onBackToCart}
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Volver al carrito
      </button>

      <form className={styles.checkoutLayout} onSubmit={handlePay}>
        <div className={styles.checkoutForm}>
          <header className={styles.checkoutHeading}>
            <p>Compra segura</p>
            <h1 id="checkout-title">
              {empresa?.tiene_envios ? "Entrega y confirmacion" : "Finaliza tu compra"}
            </h1>
            <span>
              {empresa?.tiene_envios
                ? "Revisa la entrega y tu compra antes de iniciar el pago."
                : "Revisa tu compra antes de iniciar el pago."}
            </span>
          </header>

          {pendingOrder && (
            <div className={styles.lockedOrderNotice}>
              <PackageCheck size={24} aria-hidden="true" />
              <div>
                <strong>Pedido {pendingOrder.numero} creado</strong>
                <span>Los datos comerciales ya estan confirmados. Puedes reintentar el pago.</span>
              </div>
            </div>
          )}

          <fieldset className={styles.formFieldset} disabled={Boolean(pendingOrder)}>
            <section className={styles.formSection} aria-labelledby="delivery-title">
              <div className={styles.formHeading}>
                <span aria-hidden="true">
                  {empresa?.tiene_envios ? <Truck size={22} /> : <Building2 size={22} />}
                </span>
                <div>
                  <h2 id="delivery-title">
                    {empresa?.tiene_envios ? "Forma de entrega" : "Informacion de tu compra"}
                  </h2>
                  <p>{empresa?.nombre}</p>
                </div>
              </div>

              {empresa?.tiene_envios ? (
                <div className={styles.deliverySwitch}>
                  <label className={deliveryType === "envio_local" ? styles.selectedMode : ""}>
                    <input
                      type="radio"
                      name="tipo_entrega"
                      value="envio_local"
                      checked={deliveryType === "envio_local"}
                      onChange={(event) => setDeliveryType(event.target.value)}
                    />
                    <MapPin size={18} aria-hidden="true" />
                    Envio local
                  </label>
                  <label
                    className={deliveryType === "envio_nacional" ? styles.selectedMode : ""}
                  >
                    <input
                      type="radio"
                      name="tipo_entrega"
                      value="envio_nacional"
                      checked={deliveryType === "envio_nacional"}
                      onChange={(event) => setDeliveryType(event.target.value)}
                    />
                    <Truck size={18} aria-hidden="true" />
                    Envio nacional
                  </label>
                </div>
              ) : (
                <div className={styles.pickupNotice}>
                  <PackageCheck size={23} aria-hidden="true" />
                  <div>
                    <strong>Despues de comprar</strong>
                    <span>
                      Si tu compra incluye examenes, puedes acudir a tu sucursal mas cercana. Para
                      otros servicios, contactanos al{" "}
                      <a href={`tel:${companyPhoneHref}`}>{companyPhone}</a>.
                    </span>
                  </div>
                </div>
              )}
            </section>

            {requiresAddress && (
              <section className={styles.formSection} aria-labelledby="address-title">
                <div className={styles.formHeading}>
                  <span aria-hidden="true">
                    <MapPin size={22} />
                  </span>
                  <div>
                    <h2 id="address-title">Datos de entrega</h2>
                    <p>Persona y lugar que recibiran el pedido</p>
                  </div>
                </div>

                <div className={styles.fieldGrid}>
                  <label>
                    Nombre de quien recibe
                    <input
                      name="nombre_recibe"
                      value={fields.nombre_recibe}
                      onChange={updateField}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label>
                    Telefono
                    <input
                      name="telefono_recibe"
                      value={fields.telefono_recibe}
                      onChange={updateField}
                      autoComplete="tel"
                      required
                    />
                  </label>
                  <label>
                    Departamento
                    <input
                      name="departamento_entrega"
                      value={fields.departamento_entrega}
                      onChange={updateField}
                      autoComplete="address-level1"
                      required
                    />
                  </label>
                  <label>
                    Municipio
                    <input
                      name="municipio_entrega"
                      value={fields.municipio_entrega}
                      onChange={updateField}
                      autoComplete="address-level2"
                      required
                    />
                  </label>
                  <label className={styles.fullField}>
                    Direccion
                    <textarea
                      name="direccion_entrega"
                      value={fields.direccion_entrega}
                      onChange={updateField}
                      autoComplete="street-address"
                      rows="3"
                      required
                    />
                  </label>
                  <label className={styles.fullField}>
                    Referencia
                    <input
                      name="referencia_entrega"
                      value={fields.referencia_entrega}
                      onChange={updateField}
                      placeholder="Punto cercano o indicacion adicional"
                    />
                  </label>
                </div>
              </section>
            )}

            {empresa?.tiene_envios && (
              <section className={styles.formSection} aria-labelledby="notes-title">
                <div className={styles.formHeading}>
                  <span aria-hidden="true">
                    <ShieldCheck size={22} />
                  </span>
                  <div>
                    <h2 id="notes-title">Observaciones</h2>
                    <p>Informacion adicional para preparar tu pedido</p>
                  </div>
                </div>
                <label className={styles.notesField}>
                  <span className="srOnly">Observaciones del pedido</span>
                  <textarea
                    name="observaciones"
                    value={fields.observaciones}
                    onChange={updateField}
                    rows="3"
                    placeholder="Opcional"
                  />
                </label>
              </section>
            )}
          </fieldset>
        </div>

        <aside className={styles.orderSummary} aria-label="Resumen del pedido">
          <div className={styles.summaryHeading}>
            <div>
              <p>Tu compra</p>
              <h2>{pendingOrder ? pendingOrder.numero : "Resumen"}</h2>
            </div>
            <span>
              {displayItems.length === 1 ? "1 articulo" : `${displayItems.length} articulos`}
            </span>
          </div>

          <div className={styles.summaryItems}>
            {displayItems.map((item) => (
              <div className={styles.summaryItem} key={item.cartKey || item.codigo || item.nombre}>
                <span>{item.cantidad}</span>
                <div>
                  <strong>{item.nombre}</strong>
                  <small>{formatMoney(toNumber(item.precioFinal) * item.cantidad)}</small>
                </div>
              </div>
            ))}
          </div>

          <dl className={styles.summaryTotals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(displayTotals.subtotal)}</dd>
            </div>
            {displayTotals.discount > 0 && (
              <div>
                <dt>Descuento</dt>
                <dd>-{formatMoney(displayTotals.discount)}</dd>
              </div>
            )}
            {orderChargesTax && (
              <div>
                <dt>Impuesto {pendingOrder ? toNumber(pendingOrder.tasa_impuesto) * 100 : taxPercentage}%</dt>
                <dd>{formatMoney(displayTotals.tax)}</dd>
              </div>
            )}
            {empresa?.tiene_envios && (
              <div>
                <dt>Envio</dt>
                <dd>{pendingOrder ? formatMoney(displayTotals.shipping) : "Al confirmar"}</dd>
              </div>
            )}
            <div className={styles.summaryGrandTotal}>
              <dt>{empresa?.tiene_envios && !pendingOrder ? "Total sin envio" : "Total"}</dt>
              <dd>{formatMoney(displayTotals.total)}</dd>
            </div>
          </dl>

          {feedback && (
            <div className={styles.feedback} role="alert">
              {feedback}
            </div>
          )}

          <button
            className={styles.payButton}
            type="submit"
            disabled={!hasCheckoutItems || isBusy}
          >
            <WalletCards size={20} aria-hidden="true" />
            {isSubmitting
              ? "Preparando pago"
              : pendingOrder
                ? "Reintentar pago"
                : "Pagar e iniciar pago"}
          </button>
          <p className={styles.secureNote}>
            <ShieldCheck size={15} aria-hidden="true" />
            Su compra es segura y verificada.
          </p>
        </aside>
      </form>
    </section>
  );
}

export default CheckoutPage;
