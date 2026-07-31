import { Heart, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { resolveMediaUrl } from "../../services/apiClient";
import { formatMoney, toNumber } from "../../utils/money";
import styles from "./FavoritesDrawer.module.css";

function getFavoriteLabel(favorite) {
  if (favorite.tipo_articulo === "perfil") {
    return "Perfil";
  }

  if (favorite.tipo_articulo === "combo") {
    return "Combo";
  }

  return favorite.articulo_categoria || favorite.articulo_familia || "Producto";
}

function FavoritesDrawer({
  error,
  isLoading,
  isOpen,
  items,
  onAddToCart,
  onClose,
  onRemove,
  removingIds,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <button
        className={styles.backdrop}
        type="button"
        onClick={onClose}
        aria-label="Cerrar favoritos"
      />

      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-title"
      >
        <div className={styles.header}>
          <div>
            <p>Guardados para despues</p>
            <h2 id="favorites-title">Favoritos</h2>
            <span>
              {items.length === 1 ? "1 articulo" : `${items.length} articulos`}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar favoritos">
            <X size={21} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading} role="status">
            Cargando favoritos...
          </div>
        ) : items.length > 0 ? (
          <div className={styles.items}>
            {items.map((favorite) => {
              const imageUrl = resolveMediaUrl(favorite.articulo_imagen_final);
              const isRemoving = removingIds.has(favorite.id);
              const isOutOfStock = favorite.articulo_agotado === true;

              return (
                <article
                  className={`${styles.item} ${
                    imageUrl ? styles.itemWithImage : ""
                  }`}
                  key={favorite.id}
                >
                  {imageUrl && (
                    <div className={styles.media}>
                      <img src={imageUrl} alt="" />
                    </div>
                  )}

                  <div className={styles.itemBody}>
                    <div className={styles.itemHeading}>
                      <span>{getFavoriteLabel(favorite)}</span>
                      <strong>{favorite.articulo_nombre}</strong>
                    </div>

                    {favorite.articulo_descripcion && (
                      <p>{favorite.articulo_descripcion}</p>
                    )}

                    <div className={styles.itemFooter}>
                      <b>{formatMoney(toNumber(favorite.articulo_precio))}</b>
                      <span className={styles.itemActions}>
                        <button
                          className={styles.removeButton}
                          type="button"
                          onClick={() => onRemove(favorite)}
                          disabled={isRemoving}
                          aria-label={`Eliminar ${favorite.articulo_nombre} de favoritos`}
                          title="Eliminar de favoritos"
                        >
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                        <button
                          className={styles.cartButton}
                          type="button"
                          onClick={() => onAddToCart(favorite)}
                          disabled={isOutOfStock || isRemoving}
                        >
                          <ShoppingCart size={17} aria-hidden="true" />
                          {isOutOfStock ? "Agotado" : "Agregar"}
                        </button>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <Heart size={28} aria-hidden="true" />
            <strong>Aun no tienes favoritos</strong>
            <span>Usa el corazon de cada articulo para guardarlo aqui.</span>
          </div>
        )}
      </aside>
    </div>
  );
}

export default FavoritesDrawer;
