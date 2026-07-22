import { Minus, Plus, Trash2, X } from "lucide-react";
import { formatMoney } from "../../utils/money";
import styles from "./CartDrawer.module.css";

function CartDrawer({
  empresa,
  isOpen,
  items,
  onClose,
  onDecrease,
  onIncrease,
  onRemove,
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

        {items.length > 0 ? (
          <div className={styles.items}>
            {items.map((item) => (
              <article className={styles.item} key={item.codigo_barra}>
                <div>
                  <strong>{item.nombre}</strong>
                  <span>{formatMoney(item.precio)}</span>
                </div>
                <div className={styles.quantity}>
                  <button type="button" onClick={() => onDecrease(item.codigo_barra)}>
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <span>{item.cantidad}</span>
                  <button type="button" onClick={() => onIncrease(item.codigo_barra)}>
                    <Plus size={16} aria-hidden="true" />
                  </button>
                  <button
                    className={styles.removeButton}
                    type="button"
                    onClick={() => onRemove(item.codigo_barra)}
                    aria-label={`Eliminar ${item.nombre}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>Tu carrito esta vacio</strong>
            <span>Agrega productos del catalogo para preparar tu compra.</span>
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
          <div>
            <dt>Impuesto 15%</dt>
            <dd>{formatMoney(totals.tax)}</dd>
          </div>
          <div>
            <dt>Envio</dt>
            <dd>{empresa?.tiene_envios ? "Por definir" : formatMoney(0)}</dd>
          </div>
          <div className={styles.grandTotal}>
            <dt>Total</dt>
            <dd>{formatMoney(totals.total)}</dd>
          </div>
        </dl>

        <button className={styles.checkoutButton} type="button" disabled={items.length === 0}>
          Continuar compra
        </button>
      </aside>
      <button className={styles.backdrop} type="button" onClick={onClose} aria-label="Cerrar carrito" />
    </div>
  );
}

export default CartDrawer;
