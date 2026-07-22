import { useEffect, useMemo, useState } from "react";
import CartDrawer from "../components/cart/CartDrawer";
import MenuPage from "../components/content/MenuPage";
import CategoryStrip from "../components/catalog/CategoryStrip";
import FeaturedProducts from "../components/catalog/FeaturedProducts";
import HeroPromo from "../components/catalog/HeroPromo";
import Header from "../components/layout/Header";
import MainNav from "../components/layout/MainNav";
import { getCategorias, getFamilias, getProductos } from "../services/catalogoService";
import { getEmpresaActual } from "../services/empresaService";
import { getBannersPromocionales } from "../services/promocionesService";
import { findActiveMenuItem, normalizeMenuItems, normalizePath } from "../utils/menu";
import { toNumber } from "../utils/money";
import styles from "./App.module.css";

const LOCAL_EMPRESA_SLUG = import.meta.env.VITE_EMPRESA_SLUG || "Analiza";

function buildEmpresaTheme(empresa) {
  return {
    "--color-ink": empresa?.color_texto || "#000000",
    "--color-surface": empresa?.color_fondo || "#ffffff",
    "--color-red-dark": empresa?.color_principal || "#d1393d",
    "--color-red-light": empresa?.color_secundario || "#e94a51",
    "--color-blue": empresa?.color_acento || "#2d4b77",
  };
}

function App() {
  const [empresa, setEmpresa] = useState(null);
  const [empresaSlug, setEmpresaSlug] = useState("");
  const [familias, setFamilias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [banners, setBanners] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    buscar: "",
    categoria: "",
    familia: "",
    orden: "",
  });
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window === "undefined" ? "/" : normalizePath(window.location.pathname),
  );

  const empresaTheme = useMemo(() => buildEmpresaTheme(empresa), [empresa]);
  const menuItems = useMemo(() => normalizeMenuItems(empresa?.menu), [empresa]);
  const activeMenuItem = useMemo(
    () => findActiveMenuItem(menuItems, currentPath),
    [currentPath, menuItems],
  );
  const isHomePage = !activeMenuItem || activeMenuItem.key === "inicio";
  const bannersConImagen = useMemo(
    () => banners.filter((banner) => banner?.imagen_final),
    [banners],
  );

  useEffect(() => {
    function syncCurrentPath() {
      setCurrentPath(normalizePath(window.location.pathname));
    }

    window.addEventListener("popstate", syncCurrentPath);

    return () => {
      window.removeEventListener("popstate", syncCurrentPath);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadBaseCatalog() {
      setIsBootLoading(true);
      setIsProductsLoading(true);
      setError("");
      setEmpresaSlug("");
      setFamilias([]);
      setCategorias([]);
      setProductos([]);
      setBanners([]);

      try {
        const empresaPayload = await getEmpresaActual();
        const resolvedEmpresaSlug = empresaPayload?.slug || LOCAL_EMPRESA_SLUG;
        const [familiasPayload, categoriasPayload] = await Promise.all([
          getFamilias(resolvedEmpresaSlug),
          getCategorias(resolvedEmpresaSlug),
        ]);

        if (isActive) {
          setEmpresa(empresaPayload);
          setEmpresaSlug(resolvedEmpresaSlug);
          setFamilias(familiasPayload);
          setCategorias(categoriasPayload);
        }
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message);
          setIsProductsLoading(false);
        }
      } finally {
        if (isActive) {
          setIsBootLoading(false);
        }
      }
    }

    loadBaseCatalog();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (empresa?.nombre) {
      document.title = `${empresa.nombre} | Catalogo de ventas`;
    }
  }, [empresa]);

  useEffect(() => {
    let isActive = true;

    if (!empresaSlug) {
      setBanners([]);
      return undefined;
    }

    async function loadBanners() {
      if (isActive) {
        setBanners([]);
      }

      try {
        const bannersPayload = await getBannersPromocionales(empresaSlug);

        if (isActive) {
          setBanners(bannersPayload);
        }
      } catch {
        if (isActive) {
          setBanners([]);
        }
      }
    }

    function refreshVisibleBanners() {
      if (document.visibilityState !== "hidden") {
        loadBanners();
      }
    }

    loadBanners();
    window.addEventListener("focus", loadBanners);
    document.addEventListener("visibilitychange", refreshVisibleBanners);
    const refreshInterval = window.setInterval(refreshVisibleBanners, 30000);

    return () => {
      isActive = false;
      window.removeEventListener("focus", loadBanners);
      document.removeEventListener("visibilitychange", refreshVisibleBanners);
      window.clearInterval(refreshInterval);
    };
  }, [empresaSlug]);

  useEffect(() => {
    let isActive = true;

    if (!empresaSlug) {
      return undefined;
    }

    async function loadProducts() {
      setIsProductsLoading(true);
      setError("");

      try {
        const productsPayload = await getProductos(empresaSlug, filters);

        if (isActive) {
          setProductos(productsPayload);
        }
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message);
          setProductos([]);
        }
      } finally {
        if (isActive) {
          setIsProductsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isActive = false;
    };
  }, [empresaSlug, filters]);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.cantidad, 0),
    [cartItems],
  );

  const cartTotals = useMemo(() => {
    const subtotal = cartItems.reduce(
      (total, item) => total + toNumber(item.precio) * item.cantidad,
      0,
    );
    const discount = 0;
    const taxableBase = subtotal - discount;
    const tax = taxableBase * 0.15;

    return {
      subtotal,
      discount,
      tax,
      total: taxableBase + tax,
    };
  }, [cartItems]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      buscar: searchText.trim(),
    }));
  }

  function handleSelectFamily(familia) {
    setFilters((current) => ({
      ...current,
      familia,
    }));
  }

  function handleClearFilters() {
    setSearchText("");
    setFilters({
      buscar: "",
      categoria: "",
      familia: "",
      orden: "",
    });
  }

  function handleAddToCart(product) {
    setCartItems((current) => {
      const existingItem = current.find((item) => item.codigo_barra === product.codigo_barra);

      if (existingItem) {
        return current.map((item) =>
          item.codigo_barra === product.codigo_barra
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          codigo_barra: product.codigo_barra,
          nombre: product.nombre,
          precio: product.precio,
          cantidad: 1,
        },
      ];
    });
    setCartOpen(true);
  }

  function handleIncrease(codigoBarra) {
    setCartItems((current) =>
      current.map((item) =>
        item.codigo_barra === codigoBarra ? { ...item, cantidad: item.cantidad + 1 } : item,
      ),
    );
  }

  function handleDecrease(codigoBarra) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.codigo_barra === codigoBarra
            ? { ...item, cantidad: Math.max(item.cantidad - 1, 0) }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  function handleRemove(codigoBarra) {
    setCartItems((current) => current.filter((item) => item.codigo_barra !== codigoBarra));
  }

  function navigateToInternalPath(path) {
    const nextPath = path || "/";
    const normalizedNextPath = normalizePath(nextPath);

    if (normalizePath(window.location.pathname) !== normalizedNextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setCurrentPath(normalizedNextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleMenuNavigate(event, item) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      item.isExternal
    ) {
      return;
    }

    event.preventDefault();
    navigateToInternalPath(item.href);
  }

  function handleBrandNavigation() {
    const homeItem = menuItems.find((item) => item.key === "inicio") || menuItems[0];
    navigateToInternalPath(homeItem?.isExternal ? "/" : homeItem?.href || "/");
  }

  return (
    <div className={styles.themeRoot} style={empresaTheme}>
      <main className={styles.appShell}>
        <Header
          cartCount={cartCount}
          empresa={empresa}
          onBrandClick={handleBrandNavigation}
          onCartClick={() => setCartOpen(true)}
          onSearchChange={setSearchText}
          onSearchSubmit={handleSearchSubmit}
          searchValue={searchText}
        />
        <MainNav
          activeItemKey={activeMenuItem?.key}
          items={menuItems}
          onNavigate={handleMenuNavigate}
        />

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error} Verifica que el backend Django este activo en http://127.0.0.1:8000/api/.
          </div>
        )}

        {isHomePage ? (
          <>
            {bannersConImagen.length > 0 && <HeroPromo banners={bannersConImagen} />}

            {isBootLoading ? (
              <div className={styles.loadingBox}>Cargando informacion de la empresa...</div>
            ) : (
              <CategoryStrip
                categorias={categorias}
                familias={familias}
                onClear={handleClearFilters}
                onSelectCategory={(categoria) =>
                  setFilters((current) => ({ ...current, categoria }))
                }
                onSelectFamily={handleSelectFamily}
                selectedCategory={filters.categoria}
                selectedFamily={filters.familia}
              />
            )}

            <FeaturedProducts
              categorias={categorias}
              isLoading={isProductsLoading}
              onAddToCart={handleAddToCart}
              onCategoryChange={(categoria) =>
                setFilters((current) => ({ ...current, categoria }))
              }
              onClearFilters={handleClearFilters}
              onSortChange={(orden) => setFilters((current) => ({ ...current, orden }))}
              productos={productos}
              selectedCategory={filters.categoria}
              sortOrder={filters.orden}
            />
          </>
        ) : (
          <MenuPage empresa={empresa} item={activeMenuItem} />
        )}
      </main>

      <CartDrawer
        empresa={empresa}
        isOpen={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onDecrease={handleDecrease}
        onIncrease={handleIncrease}
        onRemove={handleRemove}
        totals={cartTotals}
      />
    </div>
  );
}

export default App;
