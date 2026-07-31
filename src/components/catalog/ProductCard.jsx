import { AlertCircle, CheckCircle2, Heart, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../services/apiClient";
import { formatMoney, toNumber } from "../../utils/money";
import styles from "./ProductCard.module.css";

function ProductCard({
  favoriteType = "producto",
  isFavorite,
  isFavoriteBusy,
  onAddToCart,
  onToggleFavorite,
  product,
  showImage = true,
  variant = "default",
}) {
  const imageUrl = resolveMediaUrl(product.imagen_final);
  const [hasImageError, setHasImageError] = useState(false);
  const controlsInventory = product.controla_inventario === true;
  const hasStockInfo =
    controlsInventory &&
    product.existencia !== undefined && product.existencia !== null && product.existencia !== "";
  const stockQuantity = Number(product.existencia);
  const isOutOfStock =
    controlsInventory &&
    (Boolean(product.agotado) ||
      (hasStockInfo && Number.isFinite(stockQuantity) && stockQuantity <= 0));
  const price = toNumber(product.precio);
  const categoryLabel = product.categoria_nombre || product.familia_nombre || "Catalogo";
  const familyLabel = product.familia_nombre || "General";
  const itemTypeLabel =
    product.tipo_item_nombre || (controlsInventory ? "Producto fisico" : "Servicio");
  const stockLabel = controlsInventory
    ? isOutOfStock
      ? "Agotado"
      : "Disponible"
    : itemTypeLabel;
  const availabilityLabel = isOutOfStock ? "Agotado" : "Disponible";
  const buttonLabel = isOutOfStock ? "Agotado" : "Agregar";
  const totalSold = Number(product.total_vendido) || 0;
  const isCompactVariant = variant === "compact" || variant === "mini";
  const isHomeVariant = variant === "home";
  const description = String(product.descripcion || "").trim();
  const favoriteSelected = Boolean(isFavorite?.(product, favoriteType));
  const favoriteBusy = Boolean(isFavoriteBusy?.(product, favoriteType));
  const cardClassName = `${styles.card} ${isCompactVariant ? styles.compactCard : ""} ${
    variant === "mini" ? styles.miniCard : ""
  } ${isHomeVariant ? styles.homeCard : ""} ${!showImage ? styles.withoutMedia : ""}`;

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  return (
    <article className={cardClassName}>
      {showImage && (
        <div className={styles.media}>
          {imageUrl && !hasImageError ? (
            <img
              src={imageUrl}
              alt={product.nombre}
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div className={styles.placeholder} aria-hidden="true" />
          )}
          <span
            className={`${styles.badge} ${
              isOutOfStock ? styles.soldOut : styles.available
            }`}
          >
            {stockLabel}
          </span>
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{categoryLabel}</span>
          <span className={styles.metaActions}>
            <span className={styles.stockNote}>
              {isOutOfStock ? (
                <AlertCircle size={15} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={15} aria-hidden="true" />
              )}
              {availabilityLabel}
            </span>
            {onToggleFavorite && (
              <button
                className={`${styles.favoriteButton} ${
                  favoriteSelected ? styles.favoriteButtonActive : ""
                }`}
                type="button"
                onClick={() => onToggleFavorite(product, favoriteType)}
                disabled={favoriteBusy}
                aria-label={
                  favoriteSelected
                    ? `Quitar ${product.nombre} de favoritos`
                    : `Guardar ${product.nombre} en favoritos`
                }
                aria-pressed={favoriteSelected}
                title={favoriteSelected ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <Heart
                  size={17}
                  fill={favoriteSelected ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            )}
          </span>
        </div>

        <h3>{product.nombre}</h3>
        {description && <p className={styles.description}>{description}</p>}

        {isHomeVariant ? (
          totalSold > 0 && (
            <span className={styles.homeSales}>
              {totalSold} vendidos
            </span>
          )
        ) : (
          <dl className={styles.details}>
            <div>
              <dt>Familia</dt>
              <dd>{familyLabel}</dd>
            </div>
            {hasStockInfo && (
              <div>
                <dt>Existencia</dt>
                <dd>{stockQuantity > 0 ? product.existencia : "Agotado"}</dd>
              </div>
            )}
            {totalSold > 0 && (
              <div>
                <dt>Vendidos</dt>
                <dd>{totalSold}</dd>
              </div>
            )}
          </dl>
        )}

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
