import { ChevronDown, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import ProductCard from "../components/catalog/ProductCard";
import { resolveMediaUrl } from "../services/apiClient";
import { getServicioDetalle, getServiciosPagina } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function slugify(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function sortByOrder(items = []) {
  return [...items].sort((first, second) => {
    const firstOrder = Number(first.orden) || 0;
    const secondOrder = Number(second.orden) || 0;

    return firstOrder - secondOrder;
  });
}

function getServiceKey(service) {
  return service.clave || slugify(service.nombre);
}

function getItemName(item) {
  return typeof item === "string" ? item : item?.nombre || item?.titulo || item?.clave || "";
}

function getCategoryProducts(category) {
  if (!category || typeof category !== "object") {
    return [];
  }

  return asList(
    category.productos ||
      category.items ||
      category.servicios ||
      category.examenes ||
      category.productos_disponibles,
  );
}

function getServiceInitial(serviceName) {
  return String(serviceName || "S").trim().charAt(0).toUpperCase() || "S";
}

function ServiceTypesPage({ empresaSlug, onAddToCart, title }) {
  const [items, setItems] = useState([]);
  const [detailsByKey, setDetailsByKey] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [expandedService, setExpandedService] = useState("");
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

  async function loadDetail(service) {
    const serviceKey = getServiceKey(service);

    if (!empresaSlug || detailsByKey[serviceKey] || loadingDetails[serviceKey]) {
      return;
    }

    setLoadingDetails((current) => ({ ...current, [serviceKey]: true }));
    setDetailErrors((current) => ({ ...current, [serviceKey]: "" }));

    try {
      const payload = await getServicioDetalle(empresaSlug, serviceKey || service.nombre);

      setDetailsByKey((current) => ({ ...current, [serviceKey]: payload }));
    } catch {
      setDetailErrors((current) => ({
        ...current,
        [serviceKey]: "No se pudo cargar el detalle de esta familia.",
      }));
    } finally {
      setLoadingDetails((current) => ({ ...current, [serviceKey]: false }));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setQuery(searchText.trim());
    setExpandedService("");
  }

  function handleToggle(service) {
    const serviceKey = getServiceKey(service);
    const nextExpandedService = expandedService === serviceKey ? "" : serviceKey;

    setExpandedService(nextExpandedService);

    if (nextExpandedService) {
      loadDetail(service);
    }
  }

  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Servicios</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading ? "Buscando" : `${items.length} familias`}
          </span>
        </div>

        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Buscar familia"
          />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.serviceAccordion} aria-busy="true">
          {[1, 2, 3, 4].map((item) => (
            <div className={styles.serviceSkeletonCard} key={item}>
              <span />
              <div>
                <strong />
                <small />
                <small />
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className={styles.serviceAccordion}>
          {items.map((item) => {
            const serviceKey = getServiceKey(item);
            const isOpen = expandedService === serviceKey;
            const imageUrl = resolveMediaUrl(item.imagen_final || item.imagen);
            const summaryCategories = sortByOrder(asList(item.categorias));
            const detail = detailsByKey[serviceKey];
            const detailCategories = sortByOrder(asList(detail?.categorias));
            const categories = detailCategories.length > 0 ? detailCategories : summaryCategories;
            const detailError = detailErrors[serviceKey];
            const isDetailLoading = Boolean(loadingDetails[serviceKey]);
            const serviceDescription =
              item.descripcion ||
              "Explora opciones disponibles y agrega los servicios que necesitas.";

            return (
              <article
                className={`${styles.serviceAccordionItem} ${
                  isOpen ? styles.serviceAccordionItemOpen : ""
                }`}
                key={serviceKey}
              >
                <button
                  className={styles.serviceAccordionHeader}
                  type="button"
                  onClick={() => handleToggle(item)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.serviceCardRibbon} aria-hidden="true" />

                  <span className={styles.serviceVisual} aria-hidden="true">
                  {imageUrl && (
                    <img
                      className={styles.serviceAccordionImage}
                      src={imageUrl}
                      alt={item.nombre}
                    />
                  )}
                    {!imageUrl && (
                      <span className={styles.serviceVisualFallback}>
                        <Sparkles size={26} aria-hidden="true" />
                        <strong>{getServiceInitial(item.nombre)}</strong>
                      </span>
                    )}
                  </span>

                  <span className={styles.serviceAccordionText}>
                    <span className={styles.serviceEyebrow}>Familia de servicios</span>
                    <strong>{item.nombre}</strong>
                    <small>{serviceDescription}</small>
                    <span className={styles.serviceStats}>
                      {Number.isFinite(Number(item.cantidad_categorias)) && (
                        <span>{item.cantidad_categorias} categorias</span>
                      )}
                      {Number.isFinite(Number(item.cantidad_productos)) && (
                        <span>{item.cantidad_productos} productos</span>
                      )}
                    </span>
                  </span>

                  <span className={styles.serviceActionArea}>
                    <span className={styles.serviceCallToAction}>
                      <ShoppingBag size={18} aria-hidden="true" />
                      <span>{isOpen ? "Ocultar" : "Ver opciones"}</span>
                    </span>
                    <ChevronDown
                      className={styles.serviceAccordionIcon}
                      size={25}
                      aria-hidden="true"
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className={styles.serviceAccordionPanel}>
                    <div className={styles.servicePanelIntro}>
                      <div>
                        <p>Opciones disponibles</p>
                        <strong>{item.nombre}</strong>
                      </div>
                      <span>
                        {categories.length} categorias para comprar
                      </span>
                    </div>

                    {isDetailLoading && (
                      <div className={styles.serviceOptionSkeleton} aria-busy="true">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}

                    {detailError && <div className={styles.statusBox}>{detailError}</div>}

                    {!isDetailLoading && !detailError && categories.length > 0 && (
                      <div className={styles.serviceCategoryStack}>
                        {categories.map((category) => {
                          const products = getCategoryProducts(category);

                          return (
                            <section
                              className={styles.serviceCategoryBlock}
                              key={category.clave || getItemName(category)}
                            >
                              <div className={styles.serviceCategoryHead}>
                                <div>
                                  <p>{products.length || category.cantidad_productos || 0} productos</p>
                                  <h2>{getItemName(category)}</h2>
                                  {category.descripcion && <span>{category.descripcion}</span>}
                                </div>
                              </div>

                              {products.length > 0 ? (
                                <div className={`${styles.grid} ${styles.compactProductGrid}`}>
                                  {products.map((product) => (
                                    <ProductCard
                                      key={product.codigo_barra || product.codigo || product.nombre}
                                      product={product}
                                      onAddToCart={onAddToCart}
                                      variant="compact"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className={styles.statusBox}>
                                  Esta categoria no tiene productos activos por ahora.
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}

                    {!isDetailLoading && !detailError && categories.length === 0 && (
                      <div className={styles.statusBox}>
                        Esta familia no tiene categorias activas por ahora.
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.serviceEmptyState}>
          <span aria-hidden="true">
            <Search size={34} />
          </span>
          <h2>No encontramos servicios</h2>
          <p>Prueba con otro nombre o revisa las familias disponibles de la empresa.</p>
        </div>
      )}
    </section>
  );
}

export default ServiceTypesPage;
