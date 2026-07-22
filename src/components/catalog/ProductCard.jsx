import { AlertCircle, CheckCircle2, Microscope, ShoppingCart } from "lucide-react";
import { resolveMediaUrl } from "../../services/apiClient";
import { formatMoney, toNumber } from "../../utils/money";
import styles from "./ProductCard.module.css";

function ProductCard({ onAddToCart, product }) {
  const imageUrl = resolveMediaUrl(product.imagen_principal);
  const isOutOfStock = Boolean(product.agotado) || Number(product.existencia) <= 0;
  const price = toNumber(product.precio);
  const categoryLabel = product.categoria_nombre || product.familia_nombre || "Catalogo";
  const familyLabel = product.familia_nombre || "General";
  const stockLabel = isOutOfStock ? "Agotado" : "Disponible";
  const buttonLabel = isOutOfStock ? "Agotado" : "Agregar";

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {imageUrl ? (
          <img src={imageUrl} alt={product.nombre} />
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            <Microscope size={54} strokeWidth={1.4} />
          </div>
        )}
        <span className={`${styles.badge} ${isOutOfStock ? styles.soldOut : styles.available}`}>
          {stockLabel}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{categoryLabel}</span>
          <span className={styles.stockNote}>
            {isOutOfStock ? (
              <AlertCircle size={15} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={15} aria-hidden="true" />
            )}
            {stockLabel}
          </span>
        </div>

        <h3>{product.nombre}</h3>
        <p className={styles.description}>
          {product.descripcion || ""}
        </p>

        <dl className={styles.details}>
          <div>
            <dt>Familia</dt>
            <dd>{familyLabel}</dd>
          </div>
          <div>
            <dt>Existencia</dt>
            <dd>{Number(product.existencia) > 0 ? product.existencia : "Agotado"}</dd>
          </div>
        </dl>

        <div className={styles.footer}>
          <span>
            <small>Precio</small>
            <strong>{price > 0 ? formatMoney(price) : "Por definir"}</strong>
          </span>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            aria-label={`Agregar ${product.nombre} al carrito`}
          >
            <ShoppingCart size={20} aria-hidden="true" />
            <span>{buttonLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
