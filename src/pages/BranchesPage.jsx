import { Clock, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../services/apiClient";
import { getSucursales } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function BranchesPage({ empresaSlug, searchQuery = "", title }) {
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
        const payload = await getSucursales(empresaSlug, { buscar: searchQuery });

        if (isActive) {
          setItems(payload);
        }
      } catch {
        if (isActive) {
          setItems([]);
          setError("No se pudieron cargar las sucursales.");
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
          <p>Ubicaciones</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading ? "Buscando" : `${items.length} sucursales`}
          </span>
        </div>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.statusBox}>Cargando sucursales...</div>
      ) : items.length > 0 ? (
        <div className={styles.threeGrid}>
          {items.map((item) => {
            const imageUrl = resolveMediaUrl(item.imagen_final || item.imagen || item.foto);

            return (
              <article
                className={`${styles.branchCard} ${
                  imageUrl ? styles.branchCardWithImage : ""
                }`}
                key={item.nombre}
              >
                {imageUrl && (
                  <img
                    className={styles.branchImage}
                    src={imageUrl}
                    alt={`Sucursal ${item.nombre}`}
                  />
                )}
                <div className={styles.cardBody}>
                  <h3 className={styles.branchTitle}>{item.nombre}</h3>
                  <div className={styles.branchDetails}>
                    {item.direccion && (
                      <span>
                        <MapPin size={17} aria-hidden="true" />
                        {item.direccion}
                      </span>
                    )}
                    {item.telefono && (
                      <span>
                        <Phone size={17} aria-hidden="true" />
                        {item.telefono}
                      </span>
                    )}
                    {item.horario && (
                      <span>
                        <Clock size={17} aria-hidden="true" />
                        {item.horario}
                      </span>
                    )}
                  </div>
                  {item.google_maps_url && (
                    <a
                      className={styles.mapLink}
                      href={item.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir en Google Maps
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.statusBox}>
          {searchQuery
            ? `No se encontraron sucursales con "${searchQuery}".`
            : "No se encontraron sucursales."}
        </div>
      )}
    </section>
  );
}

export default BranchesPage;
