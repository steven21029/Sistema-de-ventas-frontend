import { useEffect, useState } from "react";
import PackageCard from "../components/catalog/PackageCard";
import { getPerfiles } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function PackageListPage({
  empresaSlug,
  isFavorite,
  isFavoriteBusy,
  onAddToCart,
  onToggleFavorite,
  searchQuery = "",
  title,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    if (!empresaSlug) {
      return undefined;
    }

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await getPerfiles(empresaSlug, { buscar: searchQuery });

        if (isActive) {
          setItems(payload);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setError("No se pudieron cargar los paquetes.");
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
  }, [empresaSlug, searchQuery]);

  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Paquetes</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading ? "Buscando" : `${items.length} resultados`}
          </span>
        </div>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.statusBox}>Cargando paquetes...</div>
      ) : items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <PackageCard
              favoriteType="perfil"
              isFavorite={isFavorite}
              isFavoriteBusy={isFavoriteBusy}
              item={item}
              key={item.codigo || item.nombre}
              label="Perfil"
              onAddToCart={onAddToCart}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statusBox}>
          {searchQuery
            ? `No se encontraron paquetes con "${searchQuery}".`
            : "No se encontraron paquetes."}
        </div>
      )}
    </section>
  );
}

export default PackageListPage;
