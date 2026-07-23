import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import PackageCard from "../components/catalog/PackageCard";
import { getPerfiles } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function PackageListPage({ empresaSlug, onAddToCart, title }) {
  const [items, setItems] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
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
        const payload = await getPerfiles(empresaSlug, { buscar: query });

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
  }, [empresaSlug, query]);

  function handleSubmit(event) {
    event.preventDefault();
    setQuery(searchText.trim());
  }

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
        <div className={styles.statusBox}>Cargando paquetes...</div>
      ) : items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <PackageCard
              item={item}
              key={item.codigo || item.nombre}
              label="Paquete"
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statusBox}>No se encontraron paquetes.</div>
      )}
    </section>
  );
}

export default PackageListPage;
