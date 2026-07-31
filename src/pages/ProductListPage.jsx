import { useEffect, useState } from "react";
import ProductCard from "../components/catalog/ProductCard";
import { getProductosCatalogo } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function ProductListPage({
  catalogType = "productos",
  empresaSlug,
  isFavorite,
  isFavoriteBusy,
  onAddToCart,
  onToggleFavorite,
  productImagesEnabled = true,
  searchQuery = "",
  title,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isCompactCatalog = catalogType === "examenes";

  useEffect(() => {
    let isActive = true;

    if (!empresaSlug) {
      return undefined;
    }

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await getProductosCatalogo(empresaSlug, {
          buscar: searchQuery,
          catalogType,
        });

        if (isActive) {
          setItems(payload);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setError("No se pudieron cargar los productos.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isActive = false;
    };
  }, [catalogType, empresaSlug, searchQuery]);

  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Catalogo</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading ? "Buscando" : `${items.length} resultados`}
          </span>
        </div>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.statusBox}>Cargando productos...</div>
      ) : items.length > 0 ? (
        <div className={`${styles.grid} ${isCompactCatalog ? styles.miniProductGrid : ""}`}>
          {items.map((product) => (
            <ProductCard
              isFavorite={isFavorite}
              isFavoriteBusy={isFavoriteBusy}
              key={product.codigo || product.nombre}
              product={product}
              onAddToCart={onAddToCart}
              onToggleFavorite={onToggleFavorite}
              showImage={productImagesEnabled}
              variant={isCompactCatalog ? "mini" : "default"}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statusBox}>
          {searchQuery
            ? `No se encontraron productos con "${searchQuery}".`
            : "No se encontraron productos."}
        </div>
      )}
    </section>
  );
}

export default ProductListPage;
