import { useEffect, useMemo, useState } from "react";
import HeroPromo from "../components/catalog/HeroPromo";
import PackageCard from "../components/catalog/PackageCard";
import ProductCard from "../components/catalog/ProductCard";
import { DEMO_PRODUCTS } from "../config/demoContent";
import {
  getCombosDestacados,
  getProductosMasVendidos,
} from "../services/paginasService";
import { normalizeSearchText, textIncludesSearch } from "../utils/search";
import styles from "./DynamicPages.module.css";

function countLabel(items, singular, plural) {
  return items.length === 1 ? `1 ${singular}` : `${items.length} ${plural}`;
}

function getSearchableItemText(item) {
  const products = Array.isArray(item?.productos) ? item.productos : [];

  return [
    item?.nombre,
    item?.titulo,
    item?.descripcion,
    item?.codigo,
    ...products.map((product) => product?.nombre),
  ]
    .filter(Boolean)
    .join(" ");
}

function HomePage({
  banners,
  empresaSlug,
  isDemoMode = false,
  isFavorite,
  isFavoriteBusy,
  onAddToCart,
  onNavigate,
  onToggleFavorite,
  productImagesEnabled = true,
  searchQuery = "",
}) {
  const [combos, setCombos] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [isCombosLoading, setIsCombosLoading] = useState(false);
  const [isBestSellersLoading, setIsBestSellersLoading] = useState(false);
  const [bestSellersError, setBestSellersError] = useState("");

  useEffect(() => {
    let isActive = true;

    if (isDemoMode) {
      setCombos([]);
      setBestSellers(DEMO_PRODUCTS.slice(0, 10));
      setIsCombosLoading(false);
      setIsBestSellersLoading(false);
      setBestSellersError("");
      return undefined;
    }

    if (!empresaSlug) {
      return undefined;
    }

    async function loadCombos() {
      setIsCombosLoading(true);

      try {
        const combosPayload = await getCombosDestacados(empresaSlug);

        if (isActive) {
          setCombos(combosPayload);
        }
      } catch {
        if (isActive) {
          setCombos([]);
        }
      } finally {
        if (isActive) {
          setIsCombosLoading(false);
        }
      }
    }

    async function loadBestSellers() {
      setIsBestSellersLoading(true);
      setBestSellersError("");

      try {
        const bestSellersPayload = await getProductosMasVendidos(empresaSlug);

        if (isActive) {
          setBestSellers(bestSellersPayload);
        }
      } catch {
        if (isActive) {
          setBestSellers([]);
          setBestSellersError("No se pudieron cargar los productos mas vendidos.");
        }
      } finally {
        if (isActive) {
          setIsBestSellersLoading(false);
        }
      }
    }

    setCombos([]);
    setBestSellers([]);
    loadCombos();
    loadBestSellers();

    return () => {
      isActive = false;
    };
  }, [empresaSlug, isDemoMode]);

  const normalizedSearch = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const visibleCombos = useMemo(
    () =>
      combos.filter((combo) =>
        textIncludesSearch(getSearchableItemText(combo), normalizedSearch),
      ),
    [combos, normalizedSearch],
  );
  const visibleBestSellers = useMemo(
    () =>
      bestSellers.filter((product) =>
        textIncludesSearch(getSearchableItemText(product), normalizedSearch),
      ),
    [bestSellers, normalizedSearch],
  );
  const isSearching = Boolean(normalizedSearch);
  const isPageLoading = isCombosLoading || isBestSellersLoading;
  const hasSearchResults = visibleCombos.length > 0 || visibleBestSellers.length > 0;
  const showCombosSection =
    isCombosLoading || visibleCombos.length > 0 || (!isSearching && combos.length > 0);
  const showBestSellersSection =
    isBestSellersLoading || Boolean(bestSellersError) || visibleBestSellers.length > 0;

  return (
    <>
      {!isSearching && banners.length > 0 && (
        <HeroPromo banners={banners} onNavigate={onNavigate} />
      )}

      {isSearching && !isPageLoading && !hasSearchResults && (
        <section className={styles.section} aria-label="Resultados de busqueda">
          <div className={styles.statusBox}>
            No encontramos productos ni combos con "{searchQuery}" en Inicio.
          </div>
        </section>
      )}

      {showCombosSection && (
        <section className={styles.section} aria-label="Combos destacados">
          <div className={styles.sectionHead}>
            <div>
              <p>Compra rapida</p>
              <h2>Combos</h2>
              <span className={styles.count}>
                {isCombosLoading
                  ? "Actualizando combos"
                  : countLabel(visibleCombos, "combo", "combos")}
              </span>
            </div>
          </div>

          {isCombosLoading ? (
            <div className={styles.statusBox}>Cargando combos...</div>
          ) : (
            <div className={styles.grid}>
              {visibleCombos.map((combo) => (
                <PackageCard
                  favoriteType="combo"
                  isFavorite={isFavorite}
                  isFavoriteBusy={isFavoriteBusy}
                  item={combo}
                  key={combo.codigo || combo.nombre}
                  label="Combo"
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {showBestSellersSection && (
        <section className={styles.section} aria-label="Productos mas vendidos">
          <div className={styles.sectionHead}>
            <div>
              <p>Catalogo</p>
              <h2>Mas vendidos</h2>
              <span className={styles.count}>
                {isBestSellersLoading
                  ? "Actualizando productos"
                  : countLabel(visibleBestSellers, "producto", "productos")}
              </span>
            </div>
          </div>

          {bestSellersError && <div className={styles.statusBox}>{bestSellersError}</div>}

          {isBestSellersLoading ? (
            <div className={styles.statusBox}>Cargando productos...</div>
          ) : visibleBestSellers.length > 0 ? (
            <div className={styles.homeProductGrid}>
              {visibleBestSellers.map((product) => (
                <ProductCard
                  isFavorite={isFavorite}
                  isFavoriteBusy={isFavoriteBusy}
                  key={product.codigo || product.nombre}
                  product={product}
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                  showImage={productImagesEnabled}
                  variant="home"
                />
              ))}
            </div>
          ) : (
            <div className={styles.statusBox}>No hay productos mas vendidos disponibles.</div>
          )}
        </section>
      )}
    </>
  );
}

export default HomePage;
