import { useEffect, useState } from "react";
import HeroPromo from "../components/catalog/HeroPromo";
import PackageCard from "../components/catalog/PackageCard";
import ProductCard from "../components/catalog/ProductCard";
import { DEMO_PRODUCTS } from "../config/demoContent";
import {
  getCombosDestacados,
  getProductosMasVendidos,
} from "../services/paginasService";
import styles from "./DynamicPages.module.css";

function countLabel(items, singular, plural) {
  return items.length === 1 ? `1 ${singular}` : `${items.length} ${plural}`;
}

function HomePage({
  banners,
  empresaSlug,
  isDemoMode = false,
  onAddToCart,
  onNavigate,
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
      setBestSellers(DEMO_PRODUCTS);
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

  const showCombosSection = isCombosLoading || combos.length > 0;

  return (
    <>
      {banners.length > 0 && <HeroPromo banners={banners} onNavigate={onNavigate} />}

      {showCombosSection && (
        <section className={styles.section} aria-label="Combos destacados">
          <div className={styles.sectionHead}>
            <div>
              <p>Compra rapida</p>
              <h2>Combos</h2>
              <span className={styles.count}>
                {isCombosLoading ? "Actualizando combos" : countLabel(combos, "combo", "combos")}
              </span>
            </div>
          </div>

          {isCombosLoading ? (
            <div className={styles.statusBox}>Cargando combos...</div>
          ) : (
            <div className={styles.grid}>
              {combos.map((combo) => (
                <PackageCard
                  item={combo}
                  key={combo.codigo || combo.nombre}
                  label="Combo"
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.section} aria-label="Productos mas vendidos">
        <div className={styles.sectionHead}>
          <div>
            <p>Catalogo</p>
            <h2>Mas vendidos</h2>
            <span className={styles.count}>
              {isBestSellersLoading
                ? "Actualizando productos"
                : countLabel(bestSellers, "producto", "productos")}
            </span>
          </div>
        </div>

        {bestSellersError && <div className={styles.statusBox}>{bestSellersError}</div>}

        {isBestSellersLoading ? (
          <div className={styles.statusBox}>Cargando productos...</div>
        ) : bestSellers.length > 0 ? (
          <div className={styles.grid}>
            {bestSellers.map((product) => (
              <ProductCard
                key={product.codigo_barra || product.nombre}
                product={product}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className={styles.statusBox}>No hay productos mas vendidos disponibles.</div>
        )}
      </section>
    </>
  );
}

export default HomePage;
