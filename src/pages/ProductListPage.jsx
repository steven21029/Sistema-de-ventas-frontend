import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import ProductCard from "../components/catalog/ProductCard";
import { getProductosCatalogo } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function ProductListPage({
  catalogType = "productos",
  empresaSlug,
  initialSearch = "",
  onAddToCart,
  title,
}) {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isCompactCatalog = catalogType === "examenes";

  useEffect(() => {
    setSearchText(initialSearch);
    setQuery(initialSearch);
  }, [initialSearch]);

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
          buscar: query,
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
  }, [catalogType, empresaSlug, query]);

  function handleSubmit(event) {
    event.preventDefault();
    setQuery(searchText.trim());
  }

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

        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar por nombre"
          />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.statusBox}>Cargando productos...</div>
      ) : items.length > 0 ? (
        <div className={`${styles.grid} ${isCompactCatalog ? styles.miniProductGrid : ""}`}>
          {items.map((product) => (
            <ProductCard
              key={product.codigo_barra || product.nombre}
              product={product}
              onAddToCart={onAddToCart}
              variant={isCompactCatalog ? "mini" : "default"}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statusBox}>No se encontraron productos.</div>
      )}
    </section>
  );
}

export default ProductListPage;
