import { Clock, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../services/apiClient";
import { getSucursales } from "../services/paginasService";
import { getVisibleBranchName, groupBranchesByCity } from "../utils/branches";
import styles from "./DynamicPages.module.css";

function parseSchedule(value) {
  const entries = (Array.isArray(value)
    ? value
    : String(value || "").split(/\s*(?:;|\r?\n)+\s*/))
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      if (separatorIndex < 1) {
        return { label: "Horario", value: entry.trim() };
      }

      return {
        label: entry.slice(0, separatorIndex).trim(),
        value: entry.slice(separatorIndex + 1).trim(),
      };
    });

  const standardizedEntries = entries.map((entry) => {
    const normalizedLabel = entry.label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    if (normalizedLabel.includes("lunes") && normalizedLabel.includes("viernes")) {
      return { ...entry, label: "Lunes a viernes", order: 1 };
    }

    if (normalizedLabel.includes("sabado")) {
      return { ...entry, label: "Sábado", order: 2 };
    }

    if (normalizedLabel.includes("domingo")) {
      return { ...entry, label: "Domingo", order: 3 };
    }

    return { ...entry, order: 4 };
  });

  if (!standardizedEntries.some((entry) => entry.order < 4)) {
    return standardizedEntries;
  }

  const expectedGroups = [
    { label: "Lunes a viernes", order: 1 },
    { label: "Sábado", order: 2 },
    { label: "Domingo", order: 3 },
  ];
  const completeSchedule = expectedGroups.map(
    (group) =>
      standardizedEntries.find((entry) => entry.order === group.order) || {
        ...group,
        value: "No informado",
      },
  );

  return completeSchedule.concat(
    standardizedEntries.filter((entry) => entry.order === 4),
  );
}

function BranchCard({ item }) {
  const imageUrl = resolveMediaUrl(item.imagen_final || item.imagen || item.foto);
  const schedule = parseSchedule(item.horario_lineas || item.horario);
  const visibleName = getVisibleBranchName(item.nombre) || item.nombre;

  return (
    <article
      className={`${styles.branchCard} ${imageUrl ? styles.branchCardWithImage : ""}`}
    >
      {imageUrl && (
        <img
          className={styles.branchImage}
          src={imageUrl}
          alt={`Sucursal ${visibleName}`}
        />
      )}
      <div className={styles.cardBody}>
        <h3 className={styles.branchTitle}>{visibleName}</h3>
        <div className={styles.branchDetails}>
          <span
            aria-hidden={item.direccion ? undefined : true}
            className={styles.branchAddress}
          >
            {item.direccion && (
              <>
                <MapPin size={17} aria-hidden="true" />
                {item.direccion}
              </>
            )}
          </span>
          <span
            aria-hidden={item.telefono ? undefined : true}
            className={styles.branchPhone}
          >
            {item.telefono && (
              <>
                <Phone size={17} aria-hidden="true" />
                {item.telefono}
              </>
            )}
          </span>
          {schedule.length > 0 && (
            <div className={styles.branchSchedule}>
              <Clock size={17} aria-hidden="true" />
              <dl>
                {schedule.map((entry, index) => (
                  <div className={styles.scheduleRow} key={`${entry.label}-${index}`}>
                    <dt>{entry.label}</dt>
                    <dd>{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
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
}

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

  const cityGroups = groupBranchesByCity(items);

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
        <div className={styles.branchSections}>
          {cityGroups.map((group) => (
            <section className={styles.citySection} key={group.key}>
              <div className={styles.cityLabel}>
                <MapPin size={18} aria-hidden="true" />
                <h2>{group.label}</h2>
              </div>
              <div className={`${styles.threeGrid} ${styles.branchGrid}`}>
                {group.items.map((item) => (
                  <BranchCard item={item} key={item.id || item.nombre} />
                ))}
              </div>
            </section>
          ))}
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
