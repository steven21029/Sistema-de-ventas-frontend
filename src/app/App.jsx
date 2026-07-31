import { useEffect, useMemo, useRef, useState } from "react";
import AuthDialog from "../components/auth/AuthDialog";
import CartDrawer from "../components/cart/CartDrawer";
import MenuPage from "../components/content/MenuPage";
import FavoritesDrawer from "../components/favorites/FavoritesDrawer";
import Header from "../components/layout/Header";
import MainNav from "../components/layout/MainNav";
import { DEMO_BANNERS, DEMO_EMPRESA } from "../config/demoContent";
import {
  loginUsuario,
  logoutUsuario,
  restoreUsuarioSession,
} from "../services/authService";
import { setApiUnauthorizedHandler } from "../services/apiClient";
import {
  actualizarCantidadCarrito,
  agregarArticuloCarrito,
  calcularCarritoPublico,
  eliminarItemCarrito,
  getMiCarrito,
} from "../services/cartService";
import { getEmpresaActual, getEmpresaMenu } from "../services/empresaService";
import {
  agregarFavorito,
  eliminarFavorito,
  getFavoritos,
} from "../services/favoritosService";
import { getBannersPromocionales } from "../services/promocionesService";
import BranchesPage from "../pages/BranchesPage";
import CheckoutPage from "../pages/CheckoutPage";
import ContactPage from "../pages/ContactPage";
import HomePage from "../pages/HomePage";
import PackageListPage from "../pages/PackageListPage";
import PaymentPage from "../pages/PaymentPage";
import ProductListPage from "../pages/ProductListPage";
import PromotionsPage from "../pages/PromotionsPage";
import ServiceTypesPage from "../pages/ServiceTypesPage";
import { getApiErrorMessage } from "../utils/apiError";
import { findActiveMenuItem, normalizeMenuItems, normalizePath } from "../utils/menu";
import { toNumber } from "../utils/money";
import styles from "./App.module.css";

const LOCAL_EMPRESA_SLUG = import.meta.env.VITE_EMPRESA_SLUG || "";
const CART_STORAGE_PREFIX = "ventas_cart_v1";

function getCartStorageKey(empresaSlug) {
  return `${CART_STORAGE_PREFIX}:${String(empresaSlug).trim().toLowerCase()}`;
}

function normalizeCartArticleType(value) {
  return ["producto", "perfil", "combo"].includes(value) ? value : "";
}

function getCartKey(codigo, tipoArticulo, itemKind = "catalog") {
  const keyType = tipoArticulo || (itemKind === "package" ? "package" : "producto");
  return `${keyType}:${codigo}`;
}

function getCartArticleType(item, options, itemKind) {
  const explicitType = normalizeCartArticleType(
    options?.tipoArticulo || item?.tipo_articulo || item?.tipo,
  );

  if (explicitType) {
    return explicitType;
  }

  if (itemKind !== "package") {
    return "producto";
  }

  const label = String(options?.label || "").toLowerCase();
  if (label.includes("combo")) {
    return "combo";
  }
  if (label.includes("perfil")) {
    return "perfil";
  }

  return "";
}

function sanitizeStoredCartItem(item) {
  const codigo = String(item?.codigo || "").trim();
  const nombre = String(item?.nombre || "").trim();

  if (!codigo || !nombre) {
    return null;
  }

  const itemKind = item.itemKind === "package" ? "package" : "catalog";
  const tipoArticulo =
    normalizeCartArticleType(item.tipoArticulo || item.tipo_articulo) ||
    (itemKind === "catalog" ? "producto" : "");
  const rawQuantity = Math.trunc(Number(item.cantidad));
  const cantidad = Number.isFinite(rawQuantity)
    ? Math.min(Math.max(rawQuantity, 1), 999)
    : 1;
  const precio = toNumber(item.precio);
  const precioOriginal = Math.max(toNumber(item.precioOriginal), precio);

  return {
    cartKey: getCartKey(codigo, tipoArticulo, itemKind),
    codigo,
    controla_inventario: item.controla_inventario === true,
    existencia: item.existencia ?? null,
    itemKind,
    nombre,
    precio,
    precioOriginal,
    tipoArticulo,
    cantidad,
  };
}

function getServerCartItems(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items.map((item) => {
    const tipoArticulo = normalizeCartArticleType(item.tipo_articulo) || "producto";
    const itemKind = tipoArticulo === "producto" ? "catalog" : "package";
    const codigo = String(item.codigo || "");
    const precio = toNumber(item.precio_unitario);

    return {
      cartKey: getCartKey(codigo, tipoArticulo, itemKind),
      codigo,
      itemKind,
      nombre: item.articulo_nombre || codigo,
      precio,
      precioOriginal: precio,
      serverItemId: item.id,
      tipoArticulo,
      cantidad: Number(item.cantidad) || 1,
    };
  });
}

function getStoredCart(empresaSlug) {
  if (typeof window === "undefined" || !empresaSlug) {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(getCartStorageKey(empresaSlug));
    const storedItems = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(storedItems)) {
      return [];
    }

    return storedItems.map(sanitizeStoredCartItem).filter(Boolean);
  } catch {
    return [];
  }
}

function saveStoredCart(empresaSlug, items) {
  if (typeof window === "undefined" || !empresaSlug) {
    return;
  }

  const storageKey = getCartStorageKey(empresaSlug);

  try {
    if (items.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // El carrito sigue funcionando en memoria si el navegador bloquea el almacenamiento.
  }
}

function validateServerCartPayload(payload, empresaSlug) {
  const payloadSlug = String(payload?.empresa_slug || "").toLowerCase();

  if (payloadSlug && payloadSlug !== empresaSlug.toLowerCase()) {
    throw new Error("El carrito de la cuenta pertenece a otra empresa.");
  }

  if (!payload?.id) {
    throw new Error("No se pudo identificar el carrito de la cuenta.");
  }
}

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
  return item.codigo || item.codigo_interno || item.clave || item.nombre;
}

function getFavoriteKey(item, type) {
  const articleType = type || item?.tipo_articulo || "producto";
  const articleCode = item?.articulo_codigo || getSellableCode(item || {});

  return `${String(articleType).toLowerCase()}:${String(articleCode).toLowerCase()}`;
}

function getSellablePrice(item) {
  return toNumber(item.precio ?? item.precio_combo ?? item.precio_perfil ?? 0);
}

function getPackageOriginalPrice(item, finalPrice) {
  const normalPrice = toNumber(item.precio_normal);
  return normalPrice > finalPrice ? normalPrice : finalPrice;
}

function getPageKind(menuItem) {
  return menuItem?.pageType || "inicio";
}

function getProductCatalogType(menuItem) {
  const target = `${menuItem?.key || ""} ${menuItem?.label || ""} ${menuItem?.path || ""}`;

  return target.includes("examen") ? "examenes" : "productos";
}

function getSearchConfig(pageKind, pageTitle) {
  switch (pageKind) {
    case "inicio":
      return {
        enabled: true,
        placeholder: "Buscar productos en Inicio",
      };
    case "productos":
      return {
        enabled: true,
        placeholder: `Buscar productos en ${pageTitle || "catalogo"}`,
      };
    case "paquetes":
      return {
        enabled: true,
        placeholder: `Buscar paquetes en ${pageTitle || "paquetes"}`,
      };
    case "servicios":
      return {
        enabled: true,
        placeholder: "Buscar productos en Servicios",
      };
    case "promociones":
      return {
        enabled: true,
        placeholder: "Buscar productos o promociones",
      };
    case "sucursales":
      return {
        enabled: true,
        placeholder: "Buscar sucursales",
      };
    default:
      return {
        enabled: false,
        placeholder: "Sin busqueda en esta pagina",
      };
  }
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
  const [cartStorageReadySlug, setCartStorageReadySlug] = useState("");
  const [serverCartId, setServerCartId] = useState(null);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartPersisting, setIsCartPersisting] = useState(false);
  const [cartPersistenceError, setCartPersistenceError] = useState("");
  const serverCartRequestRef = useRef(null);
  const [cartCalculation, setCartCalculation] = useState(null);
  const [cartCalculationError, setCartCalculationError] = useState("");
  const [isCartCalculating, setIsCartCalculating] = useState(false);
  const [authSession, setAuthSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [isAuthRestoring, setIsAuthRestoring] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [favoriteBusyKeys, setFavoriteBusyKeys] = useState(() => new Set());
  const [menuSearchText, setMenuSearchText] = useState("");
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window === "undefined" ? "/" : normalizePath(window.location.pathname),
  );

  const isCheckoutRoute = currentPath === "/checkout";
  const paymentReference = currentPath.startsWith("/pago/")
    ? currentPath.slice("/pago/".length)
    : "";
  const isPurchaseFlow = isCheckoutRoute || Boolean(paymentReference);
  const empresaTheme = useMemo(() => buildEmpresaTheme(empresa), [empresa]);
  const menuItems = useMemo(() => normalizeMenuItems(empresa?.menu), [empresa]);
  const activeMenuItem = useMemo(
    () => findActiveMenuItem(menuItems, currentPath),
    [currentPath, menuItems],
  );
  const activePageKind = useMemo(() => getPageKind(activeMenuItem), [activeMenuItem]);
  const searchConfig = useMemo(
    () =>
      isPurchaseFlow
        ? { enabled: false, placeholder: "" }
        : getSearchConfig(activePageKind, activeMenuItem?.label),
    [activeMenuItem?.label, activePageKind, isPurchaseFlow],
  );
  const bannersConImagen = useMemo(
    () => banners.filter((banner) => banner?.imagen_final),
    [banners],
  );
  const productImagesEnabled = empresa?.productos_con_imagen !== false;
  const favoriteKeys = useMemo(
    () => new Set(favorites.map((favorite) => getFavoriteKey(favorite))),
    [favorites],
  );
  const favoriteRemovingIds = useMemo(
    () =>
      new Set(
        favorites
          .filter((favorite) => favoriteBusyKeys.has(getFavoriteKey(favorite)))
          .map((favorite) => favorite.id),
      ),
    [favoriteBusyKeys, favorites],
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

    async function restoreSession() {
      try {
        const session = await restoreUsuarioSession();

        if (isActive) {
          setAuthSession(session);
        }
      } finally {
        if (isActive) {
          setIsAuthRestoring(false);
        }
      }
    }

    const clearUnauthorizedHandler = setApiUnauthorizedHandler(() => {
      setAuthSession(null);
      setAuthOpen(true);
    });

    restoreSession();

    return () => {
      isActive = false;
      clearUnauthorizedHandler();
    };
  }, []);

  useEffect(() => {
    setSearchText("");
    setMenuSearchText("");
  }, [currentPath]);

  useEffect(() => {
    if (isPurchaseFlow) {
      setCartOpen(false);
      setFavoritesOpen(false);
    }

    if (isPurchaseFlow && !isAuthRestoring && !authSession) {
      setAuthOpen(true);
    }
  }, [authSession, isAuthRestoring, isPurchaseFlow]);

  useEffect(() => {
    const searchTimer = window.setTimeout(() => {
      setMenuSearchText(searchConfig.enabled ? searchText.trim() : "");
    }, 320);

    return () => {
      window.clearTimeout(searchTimer);
    };
  }, [searchConfig.enabled, searchText]);

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

    setCartStorageReadySlug("");
    serverCartRequestRef.current = null;
    setServerCartId(null);
    setCartItems([]);
    setCartCalculation(null);
    setCartCalculationError("");
    setCartPersistenceError("");
    setIsCartPersisting(false);

    if (!empresaSlug || isAuthRestoring) {
      setIsCartLoading(false);
      return undefined;
    }

    if (!authSession) {
      setCartItems(getStoredCart(empresaSlug));
      setCartStorageReadySlug(empresaSlug);
      setIsCartLoading(false);
      return undefined;
    }

    async function loadServerCart() {
      setIsCartLoading(true);
      const request = (async () => {
        let payload = await getMiCarrito();
        validateServerCartPayload(payload, empresaSlug);

        let pendingGuestItems = getStoredCart(empresaSlug);
        let migrationError = "";

        for (const guestItem of [...pendingGuestItems]) {
          try {
            payload = await agregarArticuloCarrito(
              payload.id,
              guestItem.codigo,
              guestItem.tipoArticulo,
              guestItem.cantidad,
            );
            pendingGuestItems = pendingGuestItems.filter(
              (item) => item.cartKey !== guestItem.cartKey,
            );
            saveStoredCart(empresaSlug, pendingGuestItems);
          } catch (requestError) {
            if (!migrationError) {
              migrationError = getApiErrorMessage(
                requestError,
                "Algunos articulos del carrito de invitado no pudieron guardarse.",
              );
            }
          }
        }

        if (migrationError && isActive) {
          setCartPersistenceError(migrationError);
        }

        return payload;
      })();
      serverCartRequestRef.current = request;

      try {
        const payload = await request;

        if (isActive) {
          applyServerCart(payload);
        }
      } catch (requestError) {
        if (isActive) {
          setCartPersistenceError(
            requestError?.message || "No se pudo recuperar el carrito de tu cuenta.",
          );
        }
      } finally {
        if (serverCartRequestRef.current === request) {
          serverCartRequestRef.current = null;
        }
        if (isActive) {
          setIsCartLoading(false);
        }
      }
    }

    loadServerCart();

    return () => {
      isActive = false;
    };
  }, [authSession, empresaSlug, isAuthRestoring]);

  useEffect(() => {
    if (
      authSession ||
      isAuthRestoring ||
      !empresaSlug ||
      cartStorageReadySlug !== empresaSlug
    ) {
      return;
    }

    saveStoredCart(empresaSlug, cartItems);
  }, [authSession, cartItems, cartStorageReadySlug, empresaSlug, isAuthRestoring]);

  useEffect(() => {
    let isActive = true;

    setFavorites([]);
    setFavoritesError("");
    setFavoriteBusyKeys(new Set());

    if (!authSession || !empresaSlug) {
      setIsFavoritesLoading(false);
      setFavoritesOpen(false);
      return undefined;
    }

    async function loadFavorites() {
      setIsFavoritesLoading(true);

      try {
        const payload = await getFavoritos(empresaSlug);

        if (isActive) {
          setFavorites(payload);
        }
      } catch (requestError) {
        if (isActive) {
          setFavoritesError(
            getApiErrorMessage(requestError, "No se pudieron actualizar tus favoritos."),
          );
        }
      } finally {
        if (isActive) {
          setIsFavoritesLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      isActive = false;
    };
  }, [authSession, empresaSlug]);

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

  useEffect(() => {
    if (!empresaSlug || cartItems.length === 0) {
      setCartCalculation(null);
      setCartCalculationError("");
      setIsCartCalculating(false);
      return undefined;
    }

    let isActive = true;
    setIsCartCalculating(true);
    setCartCalculationError("");

    const calculationTimer = window.setTimeout(async () => {
      try {
        const payload = await calcularCarritoPublico(empresaSlug, cartItems);

        if (isActive) {
          setCartCalculation(payload);
        }
      } catch (requestError) {
        if (isActive) {
          setCartCalculation(null);
          setCartCalculationError(
            getApiErrorMessage(
              requestError,
              "No se pudieron actualizar los precios del carrito.",
            ),
          );
        }
      } finally {
        if (isActive) {
          setIsCartCalculating(false);
        }
      }
    }, 220);

    return () => {
      isActive = false;
      window.clearTimeout(calculationTimer);
    };
  }, [cartItems, empresaSlug]);

  const cartDisplayItems = useMemo(() => {
    const calculatedItems = new Map(
      (cartCalculation?.items || []).map((item) => [
        getCartKey(String(item.codigo), item.tipo_articulo),
        item,
      ]),
    );

    return cartItems.map((item) => {
      const calculation = calculatedItems.get(
        getCartKey(String(item.codigo), item.tipoArticulo, item.itemKind),
      );

      return {
        ...item,
        ...(calculation || {}),
        cantidad: item.cantidad,
        precio: calculation?.precio_unitario ?? item.precio,
        precioFinal: calculation?.precio_unitario_final ?? item.precio,
      };
    });
  }, [cartCalculation, cartItems]);

  const cartTotals = useMemo(() => {
    const fallbackSubtotal = cartItems.reduce(
      (total, item) => total + toNumber(item.precio) * item.cantidad,
      0,
    );
    const fallbackTax = empresa?.cobra_impuesto ? fallbackSubtotal * 0.15 : 0;

    return {
      subtotal: cartCalculation
        ? toNumber(cartCalculation.subtotal)
        : fallbackSubtotal,
      discount: cartCalculation
        ? toNumber(cartCalculation.descuento_total)
        : 0,
      tax: cartCalculation ? toNumber(cartCalculation.impuesto) : fallbackTax,
      total: cartCalculation
        ? toNumber(cartCalculation.total_sin_envio)
        : fallbackSubtotal + fallbackTax,
    };
  }, [cartCalculation, cartItems, empresa?.cobra_impuesto]);
  const cartChargesTax = cartCalculation
    ? cartCalculation.cobra_impuesto === true
    : empresa?.cobra_impuesto === true;
  const cartTaxPercentage = cartCalculation
    ? toNumber(cartCalculation.porcentaje_impuesto)
    : cartChargesTax
      ? 15
      : 0;

  const accountLabel = useMemo(() => {
    const firstName = authSession?.usuario?.first_name?.trim();
    return firstName || "Mi cuenta";
  }, [authSession]);

  function applyServerCart(payload) {
    setServerCartId(payload?.id || null);
    setCartItems(getServerCartItems(payload));
  }

  async function ensureServerCart() {
    if (serverCartId) {
      return serverCartId;
    }

    let request = serverCartRequestRef.current;

    if (!request) {
      request = getMiCarrito();
      serverCartRequestRef.current = request;
    }

    let payload;
    try {
      payload = await request;
    } finally {
      if (serverCartRequestRef.current === request) {
        serverCartRequestRef.current = null;
      }
    }
    validateServerCartPayload(payload, empresaSlug);

    applyServerCart(payload);
    return payload?.id;
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setMenuSearchText(searchConfig.enabled ? searchText.trim() : "");
  }

  async function handleAddToCart(product, options = {}) {
    const productCode = getSellableCode(product);
    const productPrice = getSellablePrice(product);
    const itemKind = options.itemKind === "package" ? "package" : "catalog";
    const tipoArticulo = getCartArticleType(product, options, itemKind);
    const cartKey = getCartKey(productCode, tipoArticulo, itemKind);

    if (!productCode) {
      return;
    }

    setCartOpen(true);

    if (authSession) {
      if (isCartPersisting) {
        return;
      }

      if (!tipoArticulo) {
        setCartPersistenceError(
          "No se pudo identificar si el articulo es producto, perfil o combo.",
        );
        return;
      }

      setIsCartPersisting(true);
      setCartPersistenceError("");

      try {
        const activeCartId = await ensureServerCart();
        const payload = await agregarArticuloCarrito(
          activeCartId,
          productCode,
          tipoArticulo,
          1,
        );
        applyServerCart(payload);
      } catch (requestError) {
        setCartPersistenceError(
          getApiErrorMessage(
            requestError,
            "No se pudo guardar el articulo en el carrito de tu cuenta.",
          ),
        );
      } finally {
        setIsCartPersisting(false);
      }

      return;
    }

    setCartItems((current) => {
      const existingItem = current.find((item) => item.cartKey === cartKey);

      if (existingItem) {
        return current.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                cantidad:
                  item.controla_inventario && Number.isFinite(Number(item.existencia))
                    ? Math.min(item.cantidad + 1, Number(item.existencia))
                    : item.cantidad + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          cartKey,
          codigo: productCode,
          controla_inventario: product.controla_inventario === true,
          existencia: product.existencia,
          itemKind,
          nombre: product.nombre,
          precio: productPrice,
          precioOriginal:
            itemKind === "package"
              ? getPackageOriginalPrice(product, productPrice)
              : productPrice,
          tipoArticulo,
          cantidad: 1,
        },
      ];
    });
  }

  async function handleIncrease(cartKey) {
    const currentItem = cartItems.find((item) => item.cartKey === cartKey);

    if (!currentItem) {
      return;
    }

    const nextQuantity =
      currentItem.controla_inventario &&
      Number.isFinite(Number(currentItem.existencia))
        ? Math.min(currentItem.cantidad + 1, Number(currentItem.existencia))
        : currentItem.cantidad + 1;

    if (nextQuantity === currentItem.cantidad) {
      return;
    }

    if (authSession && currentItem.serverItemId) {
      if (isCartPersisting) {
        return;
      }

      setIsCartPersisting(true);
      setCartPersistenceError("");

      try {
        await actualizarCantidadCarrito(currentItem.serverItemId, nextQuantity);
        setCartItems((current) =>
          current.map((item) =>
            item.cartKey === cartKey ? { ...item, cantidad: nextQuantity } : item,
          ),
        );
      } catch (requestError) {
        setCartPersistenceError(
          getApiErrorMessage(
            requestError,
            "No se pudo aumentar la cantidad del articulo.",
          ),
        );
      } finally {
        setIsCartPersisting(false);
      }
      return;
    }

    setCartItems((current) =>
      current.map((item) =>
        item.cartKey === cartKey
          ? { ...item, cantidad: nextQuantity }
          : item,
      ),
    );
  }

  async function handleDecrease(cartKey) {
    const currentItem = cartItems.find((item) => item.cartKey === cartKey);

    if (!currentItem) {
      return;
    }

    const nextQuantity = Math.max(currentItem.cantidad - 1, 0);

    if (authSession && currentItem.serverItemId) {
      if (isCartPersisting) {
        return;
      }

      setIsCartPersisting(true);
      setCartPersistenceError("");

      try {
        if (nextQuantity === 0) {
          await eliminarItemCarrito(currentItem.serverItemId);
          setCartItems((current) =>
            current.filter((item) => item.cartKey !== cartKey),
          );
        } else {
          await actualizarCantidadCarrito(currentItem.serverItemId, nextQuantity);
          setCartItems((current) =>
            current.map((item) =>
              item.cartKey === cartKey ? { ...item, cantidad: nextQuantity } : item,
            ),
          );
        }
      } catch (requestError) {
        setCartPersistenceError(
          getApiErrorMessage(
            requestError,
            "No se pudo reducir la cantidad del articulo.",
          ),
        );
      } finally {
        setIsCartPersisting(false);
      }
      return;
    }

    setCartItems((current) =>
      current
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, cantidad: Math.max(item.cantidad - 1, 0) }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  async function handleRemove(cartKey) {
    const currentItem = cartItems.find((item) => item.cartKey === cartKey);

    if (authSession && currentItem?.serverItemId) {
      if (isCartPersisting) {
        return;
      }

      setIsCartPersisting(true);
      setCartPersistenceError("");

      try {
        await eliminarItemCarrito(currentItem.serverItemId);
        setCartItems((current) =>
          current.filter((item) => item.cartKey !== cartKey),
        );
      } catch (requestError) {
        setCartPersistenceError(
          getApiErrorMessage(requestError, "No se pudo eliminar el articulo."),
        );
      } finally {
        setIsCartPersisting(false);
      }
      return;
    }

    setCartItems((current) => current.filter((item) => item.cartKey !== cartKey));
  }

  async function handleLogin(email, password) {
    const session = await loginUsuario(email, password);
    setAuthSession({
      perfil: session.perfil,
      usuario: session.usuario,
    });
  }

  async function handleLogout() {
    await logoutUsuario();
    setAuthSession(null);
    setFavorites([]);
    setFavoritesOpen(false);
  }

  function handleCheckout() {
    if (!authSession) {
      setAuthOpen(true);
      return;
    }

    setCartOpen(false);
    navigateToInternalPath("/checkout");
  }

  async function handleOrderCreated() {
    setCartItems([]);
    setServerCartId(null);
    setCartCalculation(null);
    setCartCalculationError("");
    setCartPersistenceError("");

    try {
      const payload = await getMiCarrito();
      validateServerCartPayload(payload, empresaSlug);
      applyServerCart(payload);
    } catch (requestError) {
      setCartPersistenceError(
        getApiErrorMessage(
          requestError,
          "El pedido fue creado, pero no se pudo preparar un carrito nuevo.",
        ),
      );
    }
  }

  function handlePaymentStarted(payment) {
    navigateToInternalPath(`/pago/${encodeURIComponent(payment.referencia)}`);
  }

  function handleNavigatePayment(reference) {
    navigateToInternalPath(`/pago/${encodeURIComponent(reference)}`);
  }

  function handleBackToCart() {
    handleBrandNavigation();
    window.setTimeout(() => setCartOpen(true), 0);
  }

  function isFavoriteItem(item, type = "producto") {
    return favoriteKeys.has(getFavoriteKey(item, type));
  }

  function isFavoriteItemBusy(item, type = "producto") {
    return favoriteBusyKeys.has(getFavoriteKey(item, type));
  }

  async function handleToggleFavorite(item, type = "producto") {
    if (!authSession) {
      setAuthOpen(true);
      return;
    }

    const articleCode = item?.articulo_codigo || getSellableCode(item || {});

    if (!empresaSlug || !articleCode) {
      return;
    }

    const favoriteKey = getFavoriteKey(item, type);
    const existingFavorite = favorites.find(
      (favorite) => getFavoriteKey(favorite) === favoriteKey,
    );

    if (favoriteBusyKeys.has(favoriteKey)) {
      return;
    }

    setFavoritesError("");
    setFavoriteBusyKeys((current) => {
      const next = new Set(current);
      next.add(favoriteKey);
      return next;
    });

    try {
      if (existingFavorite) {
        await eliminarFavorito(existingFavorite.id);
        setFavorites((current) =>
          current.filter((favorite) => favorite.id !== existingFavorite.id),
        );
      } else {
        const createdFavorite = await agregarFavorito(
          empresaSlug,
          articleCode,
          type,
        );

        setFavorites((current) => {
          const withoutDuplicate = current.filter(
            (favorite) => getFavoriteKey(favorite) !== favoriteKey,
          );
          return [...withoutDuplicate, createdFavorite];
        });
      }
    } catch (requestError) {
      setFavoritesError(
        getApiErrorMessage(requestError, "No se pudieron actualizar tus favoritos."),
      );
    } finally {
      setFavoriteBusyKeys((current) => {
        const next = new Set(current);
        next.delete(favoriteKey);
        return next;
      });
    }
  }

  function handleFavoritesClick() {
    if (!authSession) {
      setAuthOpen(true);
      return;
    }

    setFavoritesOpen(true);
  }

  function handleAddFavoriteToCart(favorite) {
    const favoriteItem = {
      codigo: favorite.articulo_codigo,
      nombre: favorite.articulo_nombre,
      precio: favorite.articulo_precio,
    };

    setFavoritesOpen(false);
    handleAddToCart(favoriteItem, {
      tipoArticulo: favorite.tipo_articulo,
    });
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

    if (isPurchaseFlow && isAuthRestoring) {
      return <div className={styles.loadingBox}>Recuperando tu sesion...</div>;
    }

    if (isPurchaseFlow && !authSession) {
      return (
        <section className={styles.purchaseAccess}>
          <p>Compra protegida</p>
          <h1>Inicia sesion para continuar</h1>
          <button type="button" onClick={() => setAuthOpen(true)}>
            Abrir inicio de sesion
          </button>
        </section>
      );
    }

    if (isCheckoutRoute) {
      return (
        <CheckoutPage
          authSession={authSession}
          cartId={serverCartId}
          chargesTax={cartChargesTax}
          empresa={empresa}
          empresaSlug={empresaSlug}
          isCalculating={isCartCalculating}
          isCartLoading={isCartLoading}
          items={cartDisplayItems}
          onBackToCart={handleBackToCart}
          onOrderCreated={handleOrderCreated}
          onPaymentStarted={handlePaymentStarted}
          taxPercentage={cartTaxPercentage}
          totals={cartTotals}
        />
      );
    }

    if (paymentReference) {
      return (
        <PaymentPage
          hasDelivery={empresa?.tiene_envios === true}
          onContinueShopping={handleBrandNavigation}
          onNavigatePayment={handleNavigatePayment}
          reference={paymentReference}
        />
      );
    }

    switch (activePageKind) {
      case "productos":
        return (
          <ProductListPage
            catalogType={getProductCatalogType(activeMenuItem)}
            empresaSlug={empresaSlug}
            isFavorite={isFavoriteItem}
            isFavoriteBusy={isFavoriteItemBusy}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
            productImagesEnabled={productImagesEnabled}
            searchQuery={menuSearchText}
            title={pageTitle}
          />
        );
      case "paquetes":
        return (
          <PackageListPage
            empresaSlug={empresaSlug}
            isFavorite={isFavoriteItem}
            isFavoriteBusy={isFavoriteItemBusy}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
            searchQuery={menuSearchText}
            title={pageTitle}
          />
        );
      case "servicios":
        return (
          <ServiceTypesPage
            empresaSlug={empresaSlug}
            isFavorite={isFavoriteItem}
            isFavoriteBusy={isFavoriteItemBusy}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
            productImagesEnabled={productImagesEnabled}
            searchQuery={menuSearchText}
            title={pageTitle}
          />
        );
      case "promociones":
        return (
          <PromotionsPage
            empresaSlug={empresaSlug}
            onNavigate={navigateToInternalPath}
            searchQuery={menuSearchText}
            title={pageTitle}
          />
        );
      case "sucursales":
        return (
          <BranchesPage
            empresaSlug={empresaSlug}
            searchQuery={menuSearchText}
            title={pageTitle}
          />
        );
      case "contacto":
        return <ContactPage empresa={empresa} empresaSlug={empresaSlug} title={pageTitle} />;
      case "inicio":
        return (
          <HomePage
            banners={bannersConImagen}
            empresaSlug={empresaSlug}
            isDemoMode={isDemoMode}
            isFavorite={isFavoriteItem}
            isFavoriteBusy={isFavoriteItemBusy}
            onNavigate={navigateToInternalPath}
            onAddToCart={handleAddToCart}
            onToggleFavorite={handleToggleFavorite}
            productImagesEnabled={productImagesEnabled}
            searchQuery={menuSearchText}
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
          accountLabel={accountLabel}
          cartCount={cartCount}
          empresa={empresa}
          favoriteCount={favorites.length}
          onAccountClick={() => setAuthOpen(true)}
          onBrandClick={handleBrandNavigation}
          onCartClick={() => setCartOpen(true)}
          onFavoritesClick={handleFavoritesClick}
          onSearchChange={setSearchText}
          onSearchSubmit={handleSearchSubmit}
          searchEnabled={searchConfig.enabled}
          searchPlaceholder={searchConfig.placeholder}
          searchValue={searchText}
          shoppingActionsHidden={isPurchaseFlow}
        />
        {!isPurchaseFlow && (
          <MainNav
            activeItemKey={activeMenuItem?.key}
            items={menuItems}
            onNavigate={handleMenuNavigate}
          />
        )}

        {error && (
          <div className={styles.errorBanner} role="alert">
            {isDemoMode
              ? "Modo de prueba activo. El backend no esta respondiendo, por eso se muestran imagenes neutrales."
              : `${error} Verifica que el backend Django este activo en http://127.0.0.1:8000/api/.`}
          </div>
        )}

        {renderCurrentPage()}
      </main>

      <FavoritesDrawer
        error={favoritesError}
        isLoading={isFavoritesLoading}
        isOpen={favoritesOpen}
        items={favorites}
        onAddToCart={handleAddFavoriteToCart}
        onClose={() => setFavoritesOpen(false)}
        onRemove={(favorite) =>
          handleToggleFavorite(favorite, favorite.tipo_articulo)
        }
        removingIds={favoriteRemovingIds}
      />

      <CartDrawer
        calculationError={cartPersistenceError || cartCalculationError}
        chargesTax={cartChargesTax}
        empresa={empresa}
        isAuthenticated={Boolean(authSession)}
        isLoading={isCartLoading}
        isOpen={cartOpen}
        isCalculating={isCartCalculating}
        isPersisting={isCartPersisting}
        items={cartDisplayItems}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        onDecrease={handleDecrease}
        onIncrease={handleIncrease}
        onRemove={handleRemove}
        taxPercentage={cartTaxPercentage}
        totals={cartTotals}
      />

      <AuthDialog
        isOpen={authOpen}
        isRestoring={isAuthRestoring}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        session={authSession}
      />
    </div>
  );
}

export default App;
