import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PurchaseSteps from "../components/checkout/PurchaseSteps";
import { iniciarPago, iniciarPagoEnSucursal } from "../services/pagoService";
import { getSucursales } from "../services/paginasService";
import { generarPedidoDesdeCarrito } from "../services/pedidoService";
import { getApiErrorMessage } from "../utils/apiError";
import { formatMoney, toNumber } from "../utils/money";
import { normalizePhone, PHONE_LENGTH, PHONE_PATTERN } from "../utils/phone";
import {
  clearCheckoutDraft,
  clearPendingOrder,
  getCheckoutDraft,
  getPendingOrder,
  saveCheckoutDraft,
  savePaymentContext,
  savePendingOrder,
} from "../utils/paymentContext";
import styles from "./CheckoutPages.module.css";

function getCustomerDefaults(session) {
  const user = session?.usuario;

  return {
    nombre_recibe: [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim(),
    telefono_recibe: normalizePhone(session?.perfil?.telefono),
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
  const checkoutScope = `${empresaSlug}:${authSession?.usuario?.id || ""}`;
  const canPayOnline = empresa?.pago_en_linea_disponible === true;
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
  const [paymentMethod, setPaymentMethod] = useState(() =>
    empresa?.pago_en_linea_disponible === true ? "en_linea" : "sucursal",
  );
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutDraftReadyScope, setCheckoutDraftReadyScope] = useState("");

  useEffect(() => {
    const storedDraft = getCheckoutDraft(checkoutScope) || {};
    const storedFields = storedDraft.fields || {};

    setCheckoutDraftReadyScope("");
    setPendingOrder(getPendingOrder(checkoutScope));
    setDeliveryType(
      empresa?.tiene_envios &&
        ["envio_local", "envio_nacional", "retiro_en_local"].includes(
          storedDraft.deliveryType,
        )
        ? storedDraft.deliveryType
        : empresa?.tiene_envios
          ? "envio_local"
          : "retiro_en_local",
    );
    setPaymentMethod(() => {
      if (storedDraft.paymentMethod === "sucursal") {
        return "sucursal";
      }

      return canPayOnline ? "en_linea" : "sucursal";
    });
    setSelectedBranchId(String(storedDraft.selectedBranchId || ""));
    setFields({
      ...getCustomerDefaults(authSession),
      departamento_entrega: String(storedFields.departamento_entrega || ""),
      direccion_entrega: String(storedFields.direccion_entrega || ""),
      municipio_entrega: String(storedFields.municipio_entrega || ""),
      nombre_recibe: String(
        storedFields.nombre_recibe || getCustomerDefaults(authSession).nombre_recibe,
      ),
      observaciones: String(storedFields.observaciones || ""),
      referencia_entrega: String(storedFields.referencia_entrega || ""),
      telefono_recibe: String(
        normalizePhone(
          storedFields.telefono_recibe ||
            getCustomerDefaults(authSession).telefono_recibe,
        ),
      ),
    });
    setCheckoutDraftReadyScope(checkoutScope);
  }, [authSession, canPayOnline, checkoutScope, empresa?.tiene_envios]);

  useEffect(() => {
    if (!checkoutScope || checkoutDraftReadyScope !== checkoutScope) {
      return;
    }

    saveCheckoutDraft(checkoutScope, {
      deliveryType,
      fields,
      paymentMethod,
      selectedBranchId,
    });
  }, [
    checkoutDraftReadyScope,
    checkoutScope,
    deliveryType,
    fields,
    paymentMethod,
    selectedBranchId,
  ]);

  useEffect(() => {
    let isActive = true;

    if (paymentMethod !== "sucursal" || !empresaSlug) {
      return undefined;
    }

    async function loadBranches() {
      setBranchesLoading(true);
      setBranchesError("");

      try {
        const payload = await getSucursales(empresaSlug);
        if (isActive) {
          setBranches(payload);
          setBranchesError(
            payload.length === 0
              ? "No hay sucursales activas disponibles para recibir el pago."
              : "",
          );
          setSelectedBranchId((current) =>
            payload.some((branch) => String(branch.id) === String(current))
              ? current
              : "",
          );
        }
      } catch {
        if (isActive) {
          setBranches([]);
          setSelectedBranchId("");
          setBranchesError("No se pudieron cargar las sucursales disponibles.");
        }
      } finally {
        if (isActive) setBranchesLoading(false);
      }
    }

    loadBranches();
    return () => {
      isActive = false;
    };
  }, [empresaSlug, paymentMethod]);

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
  const paysAtBranch = paymentMethod === "sucursal";
  const selectedBranch = branches.find(
    (branch) => String(branch.id) === String(selectedBranchId),
  );
  const paymentOptionUnavailable =
    paysAtBranch && (branchesLoading || !selectedBranchId || Boolean(branchesError));
  const companyPhone = String(empresa?.telefono || "88888888").trim();
  const companyPhoneHref = companyPhone.replace(/[^\d+]/g, "");

  function updateField(event) {
    const { name, value } = event.target;
    setFields((current) => ({
      ...current,
      [name]: name === "telefono_recibe" ? normalizePhone(value) : value,
    }));
  }

  async function handlePay(event) {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    try {
      if (paysAtBranch && !selectedBranchId) {
        throw new Error("Selecciona la sucursal donde realizaras el pago.");
      }

      if (!paysAtBranch && !canPayOnline) {
        throw new Error("El pago en linea no esta disponible para esta empresa.");
      }

      let order = pendingOrder;

      if (!order) {
        if (!cartId) {
          throw new Error("No se encontro un carrito activo para crear el pedido.");
        }

        order = await generarPedidoDesdeCarrito(cartId, {
          tipo_entrega: deliveryType,
          nombre_recibe: requiresAddress ? fields.nombre_recibe.trim() : "",
          telefono_recibe: requiresAddress
            ? normalizePhone(fields.telefono_recibe)
            : "",
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

      let payment;
      if (paysAtBranch) {
        const branchPayment = await iniciarPagoEnSucursal(order.id, selectedBranchId);
        payment = branchPayment.pago;
        if (!payment?.referencia) {
          throw new Error("El backend no devolvio la referencia del pago.");
        }
        savePaymentContext(payment.referencia, {
          metodoPago: "sucursal",
          pedidoId: branchPayment.pedido?.id || order.id,
          pedidoNumero: branchPayment.pedido?.numero || order.numero,
          prefactura: branchPayment.prefactura,
          sucursalId: Number(selectedBranchId),
          sucursalNombre: selectedBranch?.nombre || "Sucursal seleccionada",
        });
      } else {
        payment = await iniciarPago(order.id);
        if (!payment?.referencia) {
          throw new Error("El backend no devolvio la referencia del pago.");
        }
        savePaymentContext(payment.referencia, {
          metodoPago: "en_linea",
          pedidoId: order.id,
          pedidoNumero: order.numero,
        });
      }

      clearPendingOrder(checkoutScope);
      clearCheckoutDraft(checkoutScope);
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
                      type="text"
                      name="telefono_recibe"
                      value={fields.telefono_recibe}
                      onChange={updateField}
                      autoComplete="tel"
                      inputMode="numeric"
                      maxLength={PHONE_LENGTH}
                      pattern={PHONE_PATTERN}
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

          <section className={styles.formSection} aria-labelledby="payment-method-title">
            <div className={styles.formHeading}>
              <span aria-hidden="true">
                <WalletCards size={22} />
              </span>
              <div>
                <h2 id="payment-method-title">Forma de pago</h2>
                <p>Elige como deseas completar este pedido</p>
              </div>
            </div>

            <div
              className={`${styles.paymentMethodSwitch} ${
                canPayOnline ? "" : styles.singlePaymentMethod
              }`}
            >
              {canPayOnline ? (
                <label className={paymentMethod === "en_linea" ? styles.selectedMode : ""}>
                  <input
                    checked={paymentMethod === "en_linea"}
                    name="metodo_pago"
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    type="radio"
                    value="en_linea"
                  />
                  <CreditCard size={18} aria-hidden="true" />
                  Pagar en linea
                </label>
              ) : null}
              <label className={paysAtBranch ? styles.selectedMode : ""}>
                <input
                  checked={paysAtBranch}
                  name="metodo_pago"
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  type="radio"
                  value="sucursal"
                />
                <Building2 size={18} aria-hidden="true" />
                Pagar en sucursal
              </label>
            </div>

            {paysAtBranch ? (
              <div className={styles.branchPaymentFields}>
                <label htmlFor="checkout-branch">
                  Sucursal para realizar el pago
                  <select
                    disabled={branchesLoading || Boolean(branchesError)}
                    id="checkout-branch"
                    onChange={(event) => setSelectedBranchId(event.target.value)}
                    required
                    value={selectedBranchId}
                  >
                    <option value="">
                      {branchesLoading ? "Cargando sucursales..." : "Selecciona una sucursal"}
                    </option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.nombre}</option>
                    ))}
                  </select>
                </label>
                {branchesError ? <p role="alert">{branchesError}</p> : null}
                {selectedBranch?.direccion ? (
                  <span><MapPin size={16} aria-hidden="true" />{selectedBranch.direccion}</span>
                ) : null}
                <span>
                  <Mail size={16} aria-hidden="true" />
                  La prefactura sera enviada al correo verificado de tu cuenta.
                </span>
              </div>
            ) : null}
          </section>
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
            data-loading={isBusy}
            type="submit"
            disabled={!hasCheckoutItems || isBusy || paymentOptionUnavailable}
          >
            {paysAtBranch ? (
              <Building2 size={20} aria-hidden="true" />
            ) : (
              <WalletCards size={20} aria-hidden="true" />
            )}
            {isSubmitting
              ? paysAtBranch
                ? "Generando prefactura"
                : "Preparando pago"
              : pendingOrder
                ? paysAtBranch
                  ? "Solicitar prefactura"
                  : "Reintentar pago"
                : paysAtBranch
                  ? "Generar prefactura"
                  : "Pagar en linea"}
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
