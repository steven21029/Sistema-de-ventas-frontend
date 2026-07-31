import { ChevronDown, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "../components/catalog/ProductCard";
import { resolveMediaUrl } from "../services/apiClient";
import { getServicioDetalle, getServiciosPagina } from "../services/paginasService";
import { normalizeSearchText, textIncludesSearch } from "../utils/search";
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

function getCategoryKey(category) {
  return category?.clave || slugify(getItemName(category));
}

function getCategoryAccordionKey(serviceKey, category) {
  return `${serviceKey}:${getCategoryKey(category)}`;
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

function hasOwnDetail(detailsByKey, serviceKey) {
  return Object.prototype.hasOwnProperty.call(detailsByKey, serviceKey);
}

function ServiceTypesPage({
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
  const [detailsByKey, setDetailsByKey] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});
  const [expandedService, setExpandedService] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const empresaSlugRef = useRef(empresaSlug);
  const normalizedSearch = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const isSearching = Boolean(normalizedSearch);

  useEffect(() => {
    empresaSlugRef.current = empresaSlug;
    setDetailsByKey({});
    setDetailErrors({});
    setLoadingDetails({});
    setExpandedService("");
    setExpandedCategories({});
  }, [empresaSlug]);

  useEffect(() => {
    let isActive = true;

    if (!empresaSlug) {
      return undefined;
    }

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await getServiciosPagina(empresaSlug);

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
  }, [empresaSlug]);

  useEffect(() => {
    if (!empresaSlug || !isSearching || items.length === 0) {
      return;
    }

    const servicesToLoad = items.filter((service) => {
      const serviceKey = getServiceKey(service);

      return (
        !hasOwnDetail(detailsByKey, serviceKey) &&
        !loadingDetails[serviceKey] &&
        !detailErrors[serviceKey]
      );
    });

    if (servicesToLoad.length === 0) {
      return;
    }

    const requestEmpresaSlug = empresaSlug;
    const serviceKeys = servicesToLoad.map(getServiceKey);

    setLoadingDetails((current) => {
      const next = { ...current };
      serviceKeys.forEach((serviceKey) => {
        next[serviceKey] = true;
      });
      return next;
    });

    async function loadSearchDetails() {
      const results = await Promise.all(
        servicesToLoad.map(async (service) => {
          const serviceKey = getServiceKey(service);

          try {
            const payload = await getServicioDetalle(
              requestEmpresaSlug,
              serviceKey || service.nombre,
            );

            return { payload, serviceKey };
          } catch {
            return {
              error: "No se pudo revisar los productos de esta familia.",
              serviceKey,
            };
          }
        }),
      );

      if (empresaSlugRef.current !== requestEmpresaSlug) {
        return;
      }

      setDetailsByKey((current) => {
        const next = { ...current };

        results.forEach((result) => {
          if (result.payload) {
            next[result.serviceKey] = result.payload;
          }
        });

        return next;
      });
      setDetailErrors((current) => {
        const next = { ...current };

        results.forEach((result) => {
          if (result.error) {
            next[result.serviceKey] = result.error;
          }
        });

        return next;
      });
      setLoadingDetails((current) => {
        const next = { ...current };
        serviceKeys.forEach((serviceKey) => {
          next[serviceKey] = false;
        });
        return next;
      });
    }

    loadSearchDetails();
  }, [
    detailErrors,
    detailsByKey,
    empresaSlug,
    isSearching,
    items,
    loadingDetails,
  ]);

  const serviceViews = useMemo(
    () =>
      items.map((item) => {
        const serviceKey = getServiceKey(item);
        const summaryCategories = sortByOrder(asList(item.categorias));
        const detail = detailsByKey[serviceKey];
        const detailCategories = sortByOrder(asList(detail?.categorias));
        const categories =
          detailCategories.length > 0 ? detailCategories : summaryCategories;
        const categoryViews = categories
          .map((category) => {
            const products = getCategoryProducts(category);
            const visibleProducts = isSearching
              ? products.filter((product) =>
                  textIncludesSearch(getItemName(product), normalizedSearch),
                )
              : products;

            return {
              category,
              products: visibleProducts,
            };
          })
          .filter((categoryView) => !isSearching || categoryView.products.length > 0);
        const matchingProductCount = categoryViews.reduce(
          (total, categoryView) => total + categoryView.products.length,
          0,
        );

        return {
          categoryViews,
          detail,
          item,
          matchingProductCount,
          serviceKey,
        };
      }),
    [detailsByKey, isSearching, items, normalizedSearch],
  );
  const visibleServiceViews = useMemo(
    () =>
      isSearching
        ? serviceViews.filter((serviceView) => serviceView.matchingProductCount > 0)
        : serviceViews,
    [isSearching, serviceViews],
  );
  const matchingProductCount = useMemo(
    () =>
      visibleServiceViews.reduce(
        (total, serviceView) => total + serviceView.matchingProductCount,
        0,
      ),
    [visibleServiceViews],
  );
  const isSearchLoading =
    isSearching &&
    items.some((service) => {
      const serviceKey = getServiceKey(service);

      return (
        loadingDetails[serviceKey] ||
        (!hasOwnDetail(detailsByKey, serviceKey) && !detailErrors[serviceKey])
      );
    });

  useEffect(() => {
    if (!isSearching || isSearchLoading || visibleServiceViews.length === 0) {
      return;
    }

    const visibleKeys = visibleServiceViews.map((serviceView) => serviceView.serviceKey);

    setExpandedService((current) =>
      visibleKeys.includes(current) ? current : visibleKeys[0],
    );
  }, [isSearchLoading, isSearching, visibleServiceViews]);

  useEffect(() => {
    if (isSearchLoading) {
      return;
    }

    if (!isSearching) {
      setExpandedCategories({});
      return;
    }

    const matchingCategories = {};

    visibleServiceViews.forEach(({ categoryViews, serviceKey }) => {
      categoryViews.forEach(({ category }) => {
        matchingCategories[getCategoryAccordionKey(serviceKey, category)] = true;
      });
    });

    setExpandedCategories(matchingCategories);
  }, [isSearchLoading, isSearching, normalizedSearch, visibleServiceViews]);

  async function loadDetail(service) {
    const serviceKey = getServiceKey(service);

    if (
      !empresaSlug ||
      hasOwnDetail(detailsByKey, serviceKey) ||
      loadingDetails[serviceKey]
    ) {
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

  function handleToggle(service) {
    const serviceKey = getServiceKey(service);
    const nextExpandedService = expandedService === serviceKey ? "" : serviceKey;

    setExpandedService(nextExpandedService);

    if (nextExpandedService) {
      loadDetail(service);
    }
  }

  function handleCategoryToggle(serviceKey, category) {
    const categoryKey = getCategoryAccordionKey(serviceKey, category);

    setExpandedCategories((current) => ({
      ...current,
      [categoryKey]: !current[categoryKey],
    }));
  }

  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Servicios</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading || isSearchLoading
              ? "Buscando productos"
              : isSearching
                ? `${matchingProductCount} productos encontrados`
                : `${items.length} familias`}
          </span>
        </div>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading || isSearchLoading ? (
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
      ) : visibleServiceViews.length > 0 ? (
        <div className={styles.serviceAccordion}>
          {visibleServiceViews.map((serviceView) => {
            const {
              categoryViews,
              detail,
              item,
              matchingProductCount: serviceProductMatches,
              serviceKey,
            } = serviceView;
            const isOpen = expandedService === serviceKey;
            const imageUrl = resolveMediaUrl(item.imagen_final || item.imagen);
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
                      {isSearching ? (
                        <span>{serviceProductMatches} productos encontrados</span>
                      ) : (
                        <>
                          {Number.isFinite(Number(item.cantidad_categorias)) && (
                            <span>{item.cantidad_categorias} categorias</span>
                          )}
                          {Number.isFinite(Number(item.cantidad_productos)) && (
                            <span>{item.cantidad_productos} productos</span>
                          )}
                        </>
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
                        {categoryViews.length} categorias para comprar
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

                    {!isDetailLoading && !detailError && categoryViews.length > 0 && (
                      <div className={styles.serviceCategoryStack}>
                        {categoryViews.map(({ category, products }) => {
                          const categoryKey = getCategoryAccordionKey(
                            serviceKey,
                            category,
                          );
                          const isCategoryOpen = Boolean(
                            expandedCategories[categoryKey],
                          );
                          const panelId = `service-category-${slugify(categoryKey)}`;
                          const productCount =
                            products.length || category.cantidad_productos || 0;
                          const categoryImageUrl = resolveMediaUrl(
                            category.imagen_final || category.imagen,
                          );

                          return (
                            <section
                              className={`${styles.serviceCategoryBlock} ${
                                isCategoryOpen ? styles.serviceCategoryBlockOpen : ""
                              }`}
                              key={categoryKey}
                            >
                              <button
                                className={styles.serviceCategoryToggle}
                                type="button"
                                onClick={() =>
                                  handleCategoryToggle(serviceKey, category)
                                }
                                aria-expanded={isCategoryOpen}
                                aria-controls={panelId}
                              >
                                <span className={styles.serviceCategoryMain}>
                                  {categoryImageUrl && (
                                    <span
                                      className={styles.serviceCategoryMedia}
                                      aria-hidden="true"
                                    >
                                      <img src={categoryImageUrl} alt="" />
                                    </span>
                                  )}
                                  <span className={styles.serviceCategoryCopy}>
                                    <span className={styles.serviceCategoryCount}>
                                      {productCount} productos
                                    </span>
                                    <strong>{getItemName(category)}</strong>
                                    {category.descripcion && (
                                      <small>{category.descripcion}</small>
                                    )}
                                  </span>
                                </span>
                                <ChevronDown
                                  className={styles.serviceCategoryIcon}
                                  size={23}
                                  aria-hidden="true"
                                />
                              </button>

                              {isCategoryOpen && (
                                <div
                                  className={styles.serviceCategoryProducts}
                                  id={panelId}
                                >
                                  {products.length > 0 ? (
                                    <div
                                      className={`${styles.grid} ${styles.compactProductGrid}`}
                                    >
                                      {products.map((product) => (
                                        <ProductCard
                                          isFavorite={isFavorite}
                                          isFavoriteBusy={isFavoriteBusy}
                                          key={product.codigo || product.nombre}
                                          product={product}
                                          onAddToCart={onAddToCart}
                                          onToggleFavorite={onToggleFavorite}
                                          showImage={productImagesEnabled}
                                          variant="compact"
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    <div className={styles.statusBox}>
                                      Esta categoria no tiene productos activos por
                                      ahora.
                                    </div>
                                  )}
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}

                    {!isDetailLoading && !detailError && categoryViews.length === 0 && (
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
          <p>
            {isSearching
              ? `No hay productos con "${searchQuery}" dentro de Servicios.`
              : "No hay familias de servicios disponibles por ahora."}
          </p>
        </div>
      )}
    </section>
  );
}

export default ServiceTypesPage;
