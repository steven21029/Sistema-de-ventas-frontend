import { useEffect, useState } from "react";
import {
  BadgePercent,
  BookOpen,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FolderTree,
  Image,
  LayoutDashboard,
  ListTree,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  Percent,
  Settings,
  ShoppingBag,
  Tags,
  Users,
  X,
} from "lucide-react";
import {
  loginUsuario,
  logoutUsuario,
  restoreUsuarioSession,
} from "../services/authService";
import { resolveMediaUrl, setApiUnauthorizedHandler } from "../services/apiClient";
import { getAdminContext } from "../services/adminService";
import AdminDashboard from "./AdminDashboard";
import AboutSettingsPage from "./AboutSettingsPage";
import AdminResourcePage from "./AdminResourcePage";
import CompanySettingsPage from "./CompanySettingsPage";
import InventoryPage from "./InventoryPage";
import { getResourceConfigs } from "./resourceConfigs";
import styles from "./AdminApp.module.css";

const ADMIN_COMPANY_STORAGE_KEY = "ventas_admin_empresa_slug";

const NAVIGATION_GROUPS = [
  {
    label: "Resumen",
    items: [{ key: "resumen", label: "Vista general", icon: LayoutDashboard }],
  },
  {
    label: "Catalogo",
    items: [
      { key: "productos", label: "Productos y servicios", icon: ShoppingBag },
      { key: "familias", label: "Familias", icon: FolderTree },
      { key: "categorias", label: "Categorias", icon: Tags },
      { key: "paquetes", label: "Perfiles y combos", icon: Package },
    ],
  },
  {
    label: "Promocion",
    items: [
      { key: "banners", label: "Banners", icon: Image },
      { key: "ofertas", label: "Ofertas", icon: BadgePercent },
      { key: "descuentos", label: "Descuentos", icon: Percent },
    ],
  },
  {
    label: "Operacion",
    items: [
      { key: "pedidos", label: "Pedidos", icon: ClipboardList },
      { key: "pagos", label: "Pagos", icon: CreditCard },
      { key: "inventario", label: "Inventario", icon: Boxes, inventoryOnly: true },
      { key: "contactos", label: "Mensajes", icon: Mail },
    ],
  },
  {
    label: "Empresa",
    items: [
      { key: "sucursales", label: "Sucursales", icon: MapPin },
      { key: "sobre-nosotros", label: "Sobre nosotros", icon: BookOpen },
      { key: "menu", label: "Menu de la tienda", icon: ListTree },
      { key: "usuarios", label: "Usuarios", icon: Users },
      { key: "configuracion", label: "Configuracion", icon: Settings },
      { key: "empresas", label: "Todas las empresas", icon: Building2, superuserOnly: true },
    ],
  },
];

function getRouteKey() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[1] || "resumen";
}

function openStoreWithoutReload(event, companySlug) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  const nextPath = `/?empresa_slug=${encodeURIComponent(companySlug || "")}`;
  window.history.pushState({}, "", nextPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function loginErrorMessage(error) {
  const payload = error?.payload;
  if (payload?.detail) return payload.detail;
  if (payload?.non_field_errors) return payload.non_field_errors.join(" ");
  return "No se pudo iniciar sesion. Revisa el correo y la contrasena.";
}

function AdminLogin({ accessError, isChecking, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (requestError) {
      setError(loginErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginIdentity}>
        <span className={styles.loginMark}><PanelLeftClose size={30} /></span>
        <div><span>Control comercial</span><h1>Panel administrativo</h1><p>Gestiona cada empresa desde un espacio separado de la tienda publica.</p></div>
        <small>Acceso exclusivo para personal autorizado.</small>
      </section>
      <section className={styles.loginFormArea}>
        <form className={styles.loginForm} onSubmit={submit}>
          <header><span>Acceso seguro</span><h2>Inicia sesion</h2><p>Usa la cuenta administrativa asignada por tu empresa.</p></header>
          {(error || accessError) ? <div className={styles.loginError}>{error || accessError}</div> : null}
          <label><span>Correo</span><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label><span>Contrasena</span><input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          <button className={styles.loginButton} disabled={loading || isChecking} type="submit">{loading || isChecking ? <LoaderCircle className={styles.spin} size={18} /> : null}{loading ? "Verificando..." : "Entrar al panel"}</button>
          <a href="/">Volver a la tienda <ExternalLink size={14} /></a>
        </form>
      </section>
    </main>
  );
}

function AdminShell({ context, currentPage, onCompanyChange, onLogout, onNavigate, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const company = context.empresa_actual;
  const isSuperuser = context.usuario.es_superusuario;
  const visibleGroups = NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.inventoryOnly && !company?.permite_productos_fisicos) return false;
      if (item.superuserOnly && !isSuperuser) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);
  const activeItem = visibleGroups.flatMap((group) => group.items).find((item) => item.key === currentPage);
  const role = context.perfil?.rol_nombre || (isSuperuser ? "Superusuario" : "Administrador");
  const fullName = context.usuario.nombre || context.usuario.username || context.usuario.email;

  function navigate(key) {
    setMobileMenuOpen(false);
    onNavigate(key);
  }

  return (
    <div className={styles.adminShell}>
      <button aria-label="Cerrar menu" className={`${styles.mobileScrim} ${mobileMenuOpen ? styles.mobileScrimVisible : ""}`} onClick={() => setMobileMenuOpen(false)} type="button" />
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <header className={styles.sidebarBrand}>
          <div className={styles.brandLogo}>{company?.logo ? <img alt="" src={resolveMediaUrl(company.logo)} /> : <Building2 size={24} />}</div>
          <div><strong>{company?.nombre || "Administracion"}</strong><span>Control comercial</span></div>
          <button aria-label="Cerrar menu" onClick={() => setMobileMenuOpen(false)} type="button"><X size={20} /></button>
        </header>

        {context.empresas_disponibles?.length > 1 ? (
          <label className={styles.companySelector}>
            <span>Empresa activa</span>
            <select onChange={(event) => onCompanyChange(event.target.value)} value={company?.slug || ""}>
              {context.empresas_disponibles.map((item) => <option key={item.id} value={item.slug}>{item.nombre}</option>)}
            </select>
          </label>
        ) : <div className={styles.companyFixed}><span>Empresa activa</span><strong>{company?.nombre}</strong></div>}

        <nav className={styles.sidebarNav}>
          {visibleGroups.map((group) => (
            <section key={group.label}>
              <span>{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return <button className={currentPage === item.key ? styles.navActive : ""} key={item.key} onClick={() => navigate(item.key)} type="button"><Icon size={18} /><span>{item.label}</span></button>;
              })}
            </section>
          ))}
        </nav>

        <footer className={styles.sidebarFooter}>
          <a
            href={`/?empresa_slug=${encodeURIComponent(company?.slug || "")}`}
            onClick={(event) => openStoreWithoutReload(event, company?.slug)}
          >
            <ExternalLink size={16} /> Abrir tienda publica
          </a>
        </footer>
      </aside>

      <div className={styles.adminMain}>
        <header className={styles.topbar}>
          <div><button aria-label="Abrir menu" onClick={() => setMobileMenuOpen(true)} type="button"><Menu size={21} /></button><span>{activeItem?.label || "Panel administrativo"}</span></div>
          <div className={styles.accountMenu}>
            <button aria-expanded={accountOpen} onClick={() => setAccountOpen((current) => !current)} type="button"><span className={styles.avatar}>{fullName.slice(0, 1).toUpperCase()}</span><span><strong>{fullName}</strong><small>{role}</small></span><ChevronDown size={16} /></button>
            {accountOpen ? <div className={styles.accountPopover}><span>{context.usuario.email}</span><button onClick={onLogout} type="button"><LogOut size={16} /> Cerrar sesion</button></div> : null}
          </div>
        </header>
        <main className={styles.adminContent}>{children}</main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [context, setContext] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [currentPage, setCurrentPage] = useState(getRouteKey);

  async function resolveContext(preferredSlug = "") {
    setLoadingContext(true);
    setAccessError("");
    try {
      let payload = await getAdminContext(preferredSlug);
      if (!payload.empresa_actual && payload.empresas_disponibles?.length) {
        const firstSlug = payload.empresas_disponibles[0].slug;
        payload = await getAdminContext(firstSlug);
      }
      if (!payload.empresa_actual) throw new Error("No hay una empresa disponible para administrar.");
      window.localStorage.setItem(ADMIN_COMPANY_STORAGE_KEY, payload.empresa_actual.slug);
      setContext(payload);
      return payload;
    } catch (error) {
      if (error?.status === 403) setAccessError("Esta cuenta no tiene permiso para entrar al panel administrativo.");
      else setAccessError(error?.message || "No se pudo cargar el contexto administrativo.");
      setContext(null);
      throw error;
    } finally {
      setLoadingContext(false);
    }
  }

  useEffect(() => {
    function handlePopState() { setCurrentPage(getRouteKey()); }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;
    const clearUnauthorized = setApiUnauthorizedHandler(() => {
      setSession(null);
      setContext(null);
      setAccessError("La sesion termino. Inicia sesion nuevamente.");
    });

    async function restore() {
      try {
        const restored = await restoreUsuarioSession();
        if (!active || !restored) return;
        setSession(restored);
        const storedSlug = window.localStorage.getItem(ADMIN_COMPANY_STORAGE_KEY) || "";
        try { await resolveContext(storedSlug); }
        catch (error) {
          if (storedSlug && error?.status === 403) {
            window.localStorage.removeItem(ADMIN_COMPANY_STORAGE_KEY);
            try { await resolveContext(""); } catch { /* El mensaje ya quedo visible. */ }
          }
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    restore();
    return () => { active = false; clearUnauthorized(); };
  }, []);

  useEffect(() => {
    if (!context?.empresa_actual) return;
    document.title = `${context.empresa_actual.nombre} | Administracion`;
  }, [context]);

  async function handleLogin(email, password) {
    const payload = await loginUsuario(email, password);
    setSession({ perfil: payload.perfil, usuario: payload.usuario });
    const storedSlug = window.localStorage.getItem(ADMIN_COMPANY_STORAGE_KEY) || "";
    await resolveContext(storedSlug);
  }

  async function handleLogout() {
    await logoutUsuario();
    setSession(null);
    setContext(null);
    setAccessError("");
  }

  async function handleCompanyChange(slug) {
    await resolveContext(slug);
    setCurrentPage("resumen");
    window.history.pushState({}, "", "/administracion/resumen");
  }

  function navigate(page) {
    const nextPath = `/administracion/${page}`;
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (checkingSession) return <div className={styles.adminBoot}><LoaderCircle className={styles.spin} size={28} /><strong>Recuperando sesion administrativa</strong></div>;
  if (!session || !context) return <AdminLogin accessError={accessError} isChecking={loadingContext} onLogin={handleLogin} />;

  const configs = getResourceConfigs(context);
  const company = context.empresa_actual;
  const theme = {
    "--admin-brand": company.color_principal || "#d83a42",
    "--admin-brand-soft": company.color_secundario || "#e94a51",
    "--admin-accent": company.color_acento || "#147d73",
  };

  function renderPage() {
    if (currentPage === "resumen") return <AdminDashboard context={context} empresaSlug={company.slug} onNavigate={navigate} />;
    if (currentPage === "configuracion") return <CompanySettingsPage empresaSlug={company.slug} onCompanyUpdated={(updated) => setContext((current) => ({ ...current, empresa_actual: updated }))} />;
    if (currentPage === "sobre-nosotros") return <AboutSettingsPage empresaSlug={company.slug} />;
    if (currentPage === "inventario") return <InventoryPage company={company} empresaSlug={company.slug} />;
    const config = configs[currentPage];
    if (config?.canAccess === false) return <AdminDashboard context={context} empresaSlug={company.slug} onNavigate={navigate} />;
    if (config) return <AdminResourcePage config={config} context={context} empresaSlug={company.slug} onDataChanged={(key) => { if (["empresas"].includes(key)) resolveContext(company.slug); }} />;
    return <AdminDashboard context={context} empresaSlug={company.slug} onNavigate={navigate} />;
  }

  return <div className={styles.adminTheme} style={theme}><AdminShell context={context} currentPage={currentPage} onCompanyChange={handleCompanyChange} onLogout={handleLogout} onNavigate={navigate}>{renderPage()}</AdminShell></div>;
}
