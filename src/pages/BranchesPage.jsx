import { Clock, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../services/apiClient";
import { getSucursales } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

const CITY_GROUPS = [
  {
    key: "distrito-central",
    label: "Distrito Central",
    aliases: ["distrito central", "tegucigalpa", "comayaguela"],
    prefixes: ["dc", "teg", "tgu"],
  },
  {
    key: "comayagua",
    label: "Comayagua",
    aliases: ["comayagua"],
    prefixes: ["com", "cmy"],
  },
  {
    key: "san-pedro-sula",
    label: "San Pedro Sula",
    aliases: ["san pedro sula", "san pedro"],
    prefixes: ["sps"],
  },
  {
    key: "choluteca",
    label: "Choluteca",
    aliases: ["choluteca"],
    prefixes: ["chl", "cho"],
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getBranchCityValue(item) {
  const city = item?.ciudad;

  if (city && typeof city === "object") {
    return city.nombre || city.name || "";
  }

  return city || item?.ciudad_nombre || item?.municipio || "";
}

function getBranchCityGroup(item) {
  const cityValue = String(getBranchCityValue(item) || "").trim();
  const normalizedCity = normalizeText(cityValue);
  const normalizedName = normalizeText(item?.nombre);
  const cityGroup = CITY_GROUPS.find((group) =>
    group.aliases.some((alias) => normalizedCity.includes(alias)),
  );

  if (cityGroup) {
    return cityGroup;
  }

  if (!normalizedCity) {
    const prefixGroup = CITY_GROUPS.find((group) =>
      group.prefixes.some((prefix) =>
        new RegExp(`^${prefix}\\s*[-:–—]`).test(normalizedName),
      ),
    );

    if (prefixGroup) {
      return prefixGroup;
    }
  }

  return {
    key: normalizeText(cityValue).replace(/\s+/g, "-") || "otras-ciudades",
    label: cityValue || "Otras ciudades",
  };
}

function groupBranches(items) {
  const groups = new Map();

  items.forEach((item) => {
    const cityGroup = getBranchCityGroup(item);

    if (!groups.has(cityGroup.key)) {
      groups.set(cityGroup.key, { ...cityGroup, items: [] });
    }

    groups.get(cityGroup.key).items.push(item);
  });

  const knownGroups = CITY_GROUPS
    .map((group) => groups.get(group.key))
    .filter(Boolean);
  const additionalGroups = Array.from(groups.values())
    .filter((group) => !CITY_GROUPS.some((knownGroup) => knownGroup.key === group.key))
    .sort((first, second) => first.label.localeCompare(second.label, "es"));

  return knownGroups.concat(additionalGroups);
}

function getVisibleBranchName(value) {
  return String(value || "")
    .replace(
      /^\s*(?:[A-ZÁÉÍÓÚÑ0-9]{2,5}|(?:Distrito Central|Tegucigalpa|Comayag(?:ua|üa)|San Pedro(?: Sula)?|Choluteca))\s*[-:–—]\s*/,
      "",
    )
    .trim();
}

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

  const cityGroups = groupBranches(items);

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
