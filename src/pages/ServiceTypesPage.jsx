import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../services/apiClient";
import { getServiciosPagina } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function ServiceTypesPage({ empresaSlug, title }) {
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
        const payload = await getServiciosPagina(empresaSlug, { buscar: query });

        if (isActive) {
          setItems(payload);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setError("No se pudieron cargar los servicios.");
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
          <p>Servicios</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading ? "Buscando" : `${items.length} servicios`}
          </span>
        </div>

        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar servicio"
          />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.statusBox}>Cargando servicios...</div>
      ) : items.length > 0 ? (
        <div className={styles.threeGrid}>
          {items.map((item) => {
            const imageUrl = resolveMediaUrl(item.imagen_final || item.imagen);

            return (
              <article className={styles.serviceCard} key={item.clave || item.nombre}>
                <div className={styles.serviceImage}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.nombre} />
                  ) : (
                    <div className={styles.imagePlaceholder} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h3>{item.nombre}</h3>
                  {item.descripcion && <p>{item.descripcion}</p>}
                  {Number.isFinite(Number(item.cantidad_productos)) && (
                    <p>{item.cantidad_productos} productos disponibles</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.statusBox}>No se encontraron servicios.</div>
      )}
    </section>
  );
}

export default ServiceTypesPage;
