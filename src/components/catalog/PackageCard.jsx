import { CheckCircle2, Heart, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../services/apiClient";
import { formatMoney, toNumber } from "../../utils/money";
import styles from "./PackageCard.module.css";

function getPackagePrice(item) {
  return toNumber(item.precio_combo ?? item.precio_perfil ?? item.precio ?? 0);
}

function PackageCard({
  favoriteType = "perfil",
  isFavorite,
  isFavoriteBusy,
  item,
  label = "Paquete",
  onAddToCart,
  onToggleFavorite,
}) {
  const imageUrl = resolveMediaUrl(item.imagen_final);
  const [hasImageError, setHasImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addConfirmationId, setAddConfirmationId] = useState(0);
  const isAddConfirmed = addConfirmationId > 0;
  const finalPrice = getPackagePrice(item);
  const normalPrice = toNumber(item.precio_normal);
  const products = Array.isArray(item.productos) ? item.productos : [];
  const hasDiscount = normalPrice > finalPrice && finalPrice > 0;
  const favoriteSelected = Boolean(isFavorite?.(item, favoriteType));
  const favoriteBusy = Boolean(isFavoriteBusy?.(item, favoriteType));

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!addConfirmationId) {
      return undefined;
    }

    const confirmationTimer = window.setTimeout(() => {
      setAddConfirmationId(0);
    }, 1600);

    return () => window.clearTimeout(confirmationTimer);
  }, [addConfirmationId]);

  async function handleAddToCart() {
    if (isAdding || finalPrice <= 0) {
      return;
    }

    setIsAdding(true);

    try {
      const wasAdded = await onAddToCart(item, {
        itemKind: "package",
        label,
        tipoArticulo: favoriteType,
      });

      if (wasAdded) {
        setAddConfirmationId((current) => current + 1);
      }
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {imageUrl && !hasImageError ? (
          <img src={imageUrl} alt={item.nombre} onError={() => setHasImageError(true)} />
        ) : (
          <div className={styles.placeholder} aria-hidden="true" />
        )}
        <span>{label}</span>
        {onToggleFavorite && (
          <button
            className={`${styles.favoriteButton} ${
              favoriteSelected ? styles.favoriteButtonActive : ""
            }`}
            type="button"
            onClick={() => onToggleFavorite(item, favoriteType)}
            disabled={favoriteBusy}
            aria-label={
              favoriteSelected
                ? `Quitar ${item.nombre} de favoritos`
                : `Guardar ${item.nombre} en favoritos`
            }
            aria-pressed={favoriteSelected}
            title={favoriteSelected ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart
              size={18}
              fill={favoriteSelected ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <div className={styles.body}>
        <p>{hasDiscount ? "Precio especial" : label}</p>
        <h3>{item.nombre}</h3>
        {item.descripcion && <p className={styles.description}>{item.descripcion}</p>}

        {products.length > 0 && (
          <ul className={styles.products}>
            {products.slice(0, 4).map((product) => (
              <li key={product.codigo || product.nombre}>
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
          <button
            className={isAddConfirmed ? styles.addedButton : ""}
            type="button"
            onClick={handleAddToCart}
            disabled={finalPrice <= 0 || isAdding}
          >
            {isAddConfirmed ? (
              <CheckCircle2 size={19} aria-hidden="true" />
            ) : (
              <ShoppingCart size={19} aria-hidden="true" />
            )}
            {isAdding ? "Agregando" : isAddConfirmed ? "Agregado" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default PackageCard;
