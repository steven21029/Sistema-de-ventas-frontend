import { useEffect, useMemo, useState } from "react";
import CartDrawer from "../components/cart/CartDrawer";
import MenuPage from "../components/content/MenuPage";
import Header from "../components/layout/Header";
import MainNav from "../components/layout/MainNav";
import { DEMO_BANNERS, DEMO_EMPRESA } from "../config/demoContent";
import { getEmpresaActual, getEmpresaMenu } from "../services/empresaService";
import { getBannersPromocionales } from "../services/promocionesService";
import BranchesPage from "../pages/BranchesPage";
import ContactPage from "../pages/ContactPage";
import HomePage from "../pages/HomePage";
import PackageListPage from "../pages/PackageListPage";
import ProductListPage from "../pages/ProductListPage";
import PromotionsPage from "../pages/PromotionsPage";
import ServiceTypesPage from "../pages/ServiceTypesPage";
import { findActiveMenuItem, normalizeMenuItems, normalizePath } from "../utils/menu";
import { toNumber } from "../utils/money";
import styles from "./App.module.css";

const LOCAL_EMPRESA_SLUG = import.meta.env.VITE_EMPRESA_SLUG || "";

function buildEmpresaTheme(empresa) {
  return {
    "--color-ink": empresa?.color_texto || "#000000",
    "--color-surface": empresa?.color_fondo || "#ffffff",
    "--color-red-dark": empresa?.color_principal || "#d1393d",
    "--color-red-light": empresa?.color_secundario || "#e94a51",
    "--color-blue": empresa?.color_acento || "#2d4b77",
  };
}

function getSellableCode(item) {
  return item.codigo_barra || item.codigo || item.clave || item.nombre;
}

function getSellablePrice(item) {
  return toNumber(item.precio ?? item.precio_combo ?? item.precio_perfil ?? 0);
}

function getPageKind(menuItem) {
  return menuItem?.pageType || "inicio";
}

function getProductCatalogType(menuItem) {
  const target = `${menuItem?.key || ""} ${menuItem?.label || ""} ${menuItem?.path || ""}`;

  return target.includes("examen") ? "examenes" : "productos";
}

function App() {
  const [empresa, setEmpresa] = useState(null);
  const [empresaSlug, setEmpresaSlug] = useState("");
  const [banners, setBanners] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [menuSearchText, setMenuSearchText] = useState("");
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window === "undefined" ? "/" : normalizePath(window.location.pathname),
  );

  const empresaTheme = useMemo(() => buildEmpresaTheme(empresa), [empresa]);
  const menuItems = useMemo(() => normalizeMenuItems(empresa?.menu), [empresa]);
  const activeMenuItem = useMemo(
    () => findActiveMenuItem(menuItems, currentPath),
    [currentPath, menuItems],
  );
  const activePageKind = useMemo(() => getPageKind(activeMenuItem), [activeMenuItem]);
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
      setError("");

      try {
        const empresaPayload = await getEmpresaActual();
        const resolvedEmpresaSlug = empresaPayload?.slug || LOCAL_EMPRESA_SLUG;
        let resolvedEmpresa = empresaPayload;

        if (resolvedEmpresaSlug && !Array.isArray(empresaPayload?.menu)) {
          try {
            const menuPayload = await getEmpresaMenu(resolvedEmpresaSlug);
            resolvedEmpresa = {
              ...empresaPayload,
              menu: menuPayload,
            };
          } catch {
            resolvedEmpresa = empresaPayload;
          }
        }

        if (isActive) {
          setEmpresa(resolvedEmpresa);
          setEmpresaSlug(resolvedEmpresaSlug);
          setIsDemoMode(false);
        }
      } catch (requestError) {
        if (isActive) {
          setEmpresa(DEMO_EMPRESA);
          setEmpresaSlug("");
          setBanners(DEMO_BANNERS);
          setIsDemoMode(true);
          setError(requestError.message);
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
      if (!isDemoMode) {
        setBanners([]);
      }
      return undefined;
    }

    async function loadBanners() {
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
  }, [empresaSlug, isDemoMode]);

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
    const cleanSearch = searchText.trim();

    if (!cleanSearch) {
      return;
    }

    const productItem =
      menuItems.find((item) => item.pageType === "productos") ||
      menuItems.find((item) => item.key.includes("producto")) ||
      menuItems.find((item) => item.path.includes("producto"));

    setMenuSearchText(cleanSearch);
    navigateToInternalPath(productItem?.href || "/productos");
  }

  function handleAddToCart(product) {
    const productCode = getSellableCode(product);
    const productPrice = getSellablePrice(product);

    if (!productCode) {
      return;
    }

    setCartItems((current) => {
      const existingItem = current.find((item) => item.codigo_barra === productCode);

      if (existingItem) {
        return current.map((item) =>
          item.codigo_barra === productCode
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          codigo_barra: productCode,
          nombre: product.nombre,
          precio: productPrice,
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

  function renderCurrentPage() {
    const pageTitle = activeMenuItem?.label || "Inicio";

    if (isBootLoading) {
      return <div className={styles.loadingBox}>Cargando informacion de la empresa...</div>;
    }

    switch (activePageKind) {
      case "productos":
        return (
          <ProductListPage
            catalogType={getProductCatalogType(activeMenuItem)}
            empresaSlug={empresaSlug}
            initialSearch={menuSearchText}
            onAddToCart={handleAddToCart}
            title={pageTitle}
          />
        );
      case "paquetes":
        return (
          <PackageListPage
            empresaSlug={empresaSlug}
            onAddToCart={handleAddToCart}
            title={pageTitle}
          />
        );
      case "servicios":
        return (
          <ServiceTypesPage
            empresaSlug={empresaSlug}
            onAddToCart={handleAddToCart}
            title={pageTitle}
          />
        );
      case "promociones":
        return (
          <PromotionsPage
            empresaSlug={empresaSlug}
            onNavigate={navigateToInternalPath}
            title={pageTitle}
          />
        );
      case "sucursales":
        return <BranchesPage empresaSlug={empresaSlug} title={pageTitle} />;
      case "contacto":
        return <ContactPage empresa={empresa} empresaSlug={empresaSlug} title={pageTitle} />;
      case "inicio":
        return (
          <HomePage
            banners={bannersConImagen}
            empresaSlug={empresaSlug}
            isDemoMode={isDemoMode}
            onNavigate={navigateToInternalPath}
            onAddToCart={handleAddToCart}
          />
        );
      default:
        return <MenuPage empresa={empresa} item={activeMenuItem} />;
    }
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
            {isDemoMode
              ? "Modo de prueba activo. El backend no esta respondiendo, por eso se muestran imagenes neutrales."
              : `${error} Verifica que el backend Django este activo en http://127.0.0.1:8000/api/.`}
          </div>
        )}

        {renderCurrentPage()}
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
