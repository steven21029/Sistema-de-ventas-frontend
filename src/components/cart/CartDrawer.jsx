import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatMoney } from "../../utils/money";
import styles from "./CartDrawer.module.css";

function CartDrawer({
  calculationError,
  chargesTax,
  empresa,
  isAuthenticated,
  isLoading,
  isOpen,
  isCalculating,
  isPersisting,
  isUnavailable,
  items,
  onClose,
  onCheckout,
  onDecrease,
  onIncrease,
  onRemove,
  taxPercentage,
  totals,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation">
      <aside className={styles.drawer} aria-label="Carrito de compras" aria-modal="true">
        <div className={styles.header}>
          <div>
            <p>Compra actual</p>
            <h2>Carrito</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar carrito">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className={styles.calculationStatus} role="status">
            Cargando el carrito de tu cuenta...
          </div>
        ) : items.length > 0 ? (
          <div className={styles.items}>
            {items.map((item) => {
              const originalPrice = Number(
                item.precio_unitario ?? item.precioOriginal ?? item.precio,
              );
              const finalPrice = Number(item.precioFinal ?? item.precio);
              const hasDiscount =
                Number(item.descuento_total) > 0 || originalPrice > finalPrice;

              return (
                <article className={styles.item} key={item.cartKey}>
                  <div className={styles.itemHeading}>
                    <strong>{item.nombre}</strong>
                    <span className={styles.itemPrice}>
                      {hasDiscount && <small>{formatMoney(originalPrice)}</small>}
                      <b>{formatMoney(finalPrice)}</b>
                    </span>
                    {item.descuento_aplicado && (
                      <span className={styles.discountBadge}>
                        {item.descuento_aplicado.porcentaje}% de descuento
                      </span>
                    )}
                  </div>
                  <div className={styles.quantity}>
                    <button
                      type="button"
                      onClick={() => onDecrease(item.cartKey)}
                      disabled={isPersisting || isUnavailable}
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => onIncrease(item.cartKey)}
                      disabled={isPersisting || isUnavailable}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                    <button
                      className={styles.removeButton}
                      type="button"
                      onClick={() => onRemove(item.cartKey)}
                      disabled={isPersisting || isUnavailable}
                      aria-label={`Eliminar ${item.nombre}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>Tu carrito esta vacio</strong>
            <span>Agrega productos del catalogo para preparar tu compra.</span>
          </div>
        )}

        {!isLoading && (isPersisting || isCalculating) && (
          <div className={styles.calculationStatus} role="status">
            {isPersisting
              ? "Guardando cambios en tu carrito..."
              : "Calculando descuentos y totales..."}
          </div>
        )}

        {calculationError && (
          <div className={styles.calculationError} role="alert">
            {calculationError}
          </div>
        )}

        <dl className={styles.totals}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(totals.subtotal)}</dd>
          </div>
          <div>
            <dt>Descuento</dt>
            <dd>{formatMoney(totals.discount)}</dd>
          </div>
          {chargesTax && (
            <div>
              <dt>Impuesto {taxPercentage}%</dt>
              <dd>{formatMoney(totals.tax)}</dd>
            </div>
          )}
          {empresa?.tiene_envios === true && (
            <div>
              <dt>Envio</dt>
              <dd>Por definir</dd>
            </div>
          )}
          <div className={styles.grandTotal}>
            <dt>Total</dt>
            <dd>{formatMoney(totals.total)}</dd>
          </div>
        </dl>

        <button
          className={styles.checkoutButton}
          type="button"
          onClick={onCheckout}
          disabled={
            items.length === 0 ||
            isLoading ||
            isPersisting ||
            isUnavailable ||
            isCalculating ||
            Boolean(calculationError)
          }
        >
          {isAuthenticated ? "Continuar compra" : "Iniciar sesion para continuar"}
        </button>
      </aside>
      <button className={styles.backdrop} type="button" onClick={onClose} aria-label="Cerrar carrito" />
    </div>
  );
}

export default CartDrawer;
