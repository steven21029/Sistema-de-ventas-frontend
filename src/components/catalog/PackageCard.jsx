import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../services/apiClient";
import { formatMoney, toNumber } from "../../utils/money";
import styles from "./PackageCard.module.css";

function getPackagePrice(item) {
  return toNumber(item.precio_combo ?? item.precio_perfil ?? item.precio ?? 0);
}

function PackageCard({ item, label = "Paquete", onAddToCart }) {
  const imageUrl = resolveMediaUrl(item.imagen_final || item.imagen_principal);
  const [hasImageError, setHasImageError] = useState(false);
  const finalPrice = getPackagePrice(item);
  const normalPrice = toNumber(item.precio_normal);
  const products = Array.isArray(item.productos) ? item.productos : [];
  const hasDiscount = normalPrice > finalPrice && finalPrice > 0;

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {imageUrl && !hasImageError ? (
          <img src={imageUrl} alt={item.nombre} onError={() => setHasImageError(true)} />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
        <span>{label}</span>
      </div>

      <div className={styles.body}>
        <p>{hasDiscount ? "Precio especial" : label}</p>
        <h3>{item.nombre}</h3>
        {item.descripcion && <p className={styles.description}>{item.descripcion}</p>}

        {products.length > 0 && (
          <ul className={styles.products}>
            {products.slice(0, 4).map((product) => (
              <li key={product.codigo_barra || product.codigo || product.nombre}>
                {product.nombre}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.footer}>
          <div>
            {hasDiscount && <small>{formatMoney(normalPrice)}</small>}
            <strong>{finalPrice > 0 ? formatMoney(finalPrice) : "Por definir"}</strong>
          </div>
          <button type="button" onClick={() => onAddToCart(item)} disabled={finalPrice <= 0}>
            <ShoppingCart size={19} aria-hidden="true" />
            Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

export default PackageCard;
