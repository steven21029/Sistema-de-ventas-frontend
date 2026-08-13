import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Edit3,
  ImageOff,
  LoaderCircle,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  cancelPendingOrder,
  confirmBranchPayment,
  createAdminResource,
  deleteAdminResource,
  getAdminResourceDetail,
  listAdminResource,
  listAllAdminResource,
  runAdminAction,
  updateAdminResource,
} from "../services/adminService";
import { resolveMediaUrl } from "../services/apiClient";
import {
  getAdminPaymentMethod,
  getAdminPaymentStatus,
} from "../utils/paymentStatus";
import { getApiErrorMessage } from "../utils/apiError";
import { normalizePhone } from "../utils/phone";
import styles from "./AdminApp.module.css";

const currencyFormatter = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-HN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getErrorMessage(error, fallback) {
  return getApiErrorMessage(error, fallback);
}

function getFieldErrors(error) {
  const payload = error?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(" ") : String(value),
    ]),
  );
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFormatter.format(date);
}

function displayName(item) {
  return (
    [item?.first_name, item?.last_name].filter(Boolean).join(" ") ||
    item?.nombre ||
    item?.titulo ||
    item?.texto ||
    item?.numero ||
    item?.referencia ||
    "Registro"
  );
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSearchValue(value) {
  return normalizeValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function canCancelPendingOrder(config, item) {
  return config.key === "pedidos" && normalizeValue(item?.estado_pago) === "pendiente";
}

function canConfirmBranchPayment(config, item) {
  return (
    config.key === "pagos" &&
    normalizeValue(item?.estado) === "pendiente" &&
    getAdminPaymentMethod(item?.metodo).value === "sucursal"
  );
}

function canManageBranchOrderPayment(config, item) {
  return (
    canCancelPendingOrder(config, item) &&
    getAdminPaymentMethod(item?.metodo_pago).value === "sucursal"
  );
}

function getStatusLabel(value, type) {
  if (type === "contactStatus") {
    return { nuevo: "Nuevo", pendiente: "Pendiente", respondido: "Respondido" }[value] || value;
  }
  return value ? "Activo" : "Inactivo";
}

function getBranchStatus(value) {
  return {
    activa: { label: "Activa", tone: "true" },
    temporalmente_cerrada: { label: "Temporalmente cerrada", tone: "pendiente" },
    inactiva: { label: "Inactiva", tone: "false" },
  }[normalizeValue(value)] || { label: value || "Sin estado", tone: "false" };
}

function CellValue({ column, item }) {
  const value = item?.[column.key];

  if (column.type === "image" || column.type === "wideImage") {
    return value ? (
      <img
        alt=""
        className={column.type === "wideImage" ? styles.tableWideImage : styles.tableImage}
        src={resolveMediaUrl(value)}
      />
    ) : (
      <span className={styles.imageFallback} aria-label="Sin imagen">
        <ImageOff size={16} />
      </span>
    );
  }

  if (column.type === "primary" || column.type === "person") {
    const primary = column.type === "person" ? displayName(item) : value;
    return (
      <span className={styles.primaryCell}>
        <strong>{primary || "Sin nombre"}</strong>
        {column.secondaryKey && item?.[column.secondaryKey] ? (
          <small>{item[column.secondaryKey]}</small>
        ) : null}
      </span>
    );
  }

  if (["status", "contactStatus", "paymentStatus"].includes(column.type)) {
    const statusValue = column.type === "status" ? Boolean(value) : value;
    const paymentStatus =
      column.type === "paymentStatus" ? getAdminPaymentStatus(value, item) : null;
    const statusTone = paymentStatus?.tone ?? statusValue;
    return (
      <span className={`${styles.status} ${styles[`status_${String(statusTone)}`] || ""}`}>
        <span />
        {paymentStatus?.label ?? getStatusLabel(statusValue, column.type)}
      </span>
    );
  }

  if (column.type === "branchStatus") {
    const branchStatus = getBranchStatus(value);
    return (
      <span className={`${styles.status} ${styles[`status_${branchStatus.tone}`] || ""}`}>
        <span />
        {branchStatus.label}
      </span>
    );
  }

  if (column.type === "verified") {
    return <span className={value ? styles.verified : styles.unverified}>{value ? "Verificado" : "Pendiente"}</span>;
  }

  if (column.type === "paymentMethod") {
    return getAdminPaymentMethod(value).label;
  }

  if (column.type === "currency") return currencyFormatter.format(Number(value) || 0);
  if (column.type === "percent") return `${Number(value) || 0}%`;
  if (column.type === "date") return formatDate(value);
  if (column.type === "count") return Array.isArray(value) ? value.length : Number(value) || 0;
  if (column.type === "boolean") return value ? "Si" : "No";
  if (column.type === "truncate") return <span className={styles.truncated}>{value || "-"}</span>;
  if (column.type === "code") return <code className={styles.code}>{value || "-"}</code>;
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getInitialDraft(config, item, optionData) {
  const draft = { ...(config.initialValues || {}), ...(item || {}) };

  config.fields?.forEach((field) => {
    if (field.phone) {
      draft[field.name] = normalizePhone(draft[field.name]);
    }
    if (field.type === "file") {
      draft[field.name] = null;
    }
    if (field.type === "datetime-local") {
      draft[field.name] = toLocalDateTime(draft[field.name]);
    }
    if (field.type === "multiSelect" || field.type === "companyMultiSelect") {
      const current = item?.[field.name];
      if (Array.isArray(current)) {
        draft[field.name] = current.map((value) => Number(value?.id ?? value));
      } else if (field.type === "companyMultiSelect" && Array.isArray(item?.empresas_permitidas_detalle)) {
        draft[field.name] = item.empresas_permitidas_detalle.map((company) => Number(company.id));
      } else if (Array.isArray(item?.productos)) {
        const options = optionData[field.source] || [];
        draft[field.name] = item.productos
          .map((product) => {
            if (product.id) return product.id;
            return options.find((option) => option.codigo === product.codigo)?.id;
          })
          .filter(Boolean);
      } else {
        draft[field.name] = [];
      }
    }
    if (field.type === "productBuilder") {
      draft[field.name] = Array.isArray(item?.productos_detalle)
        ? item.productos_detalle.map((product, index) => ({
            producto_id: Number(product.producto_id),
            cantidad: Number(product.cantidad) || 1,
            orden: Number(product.orden) || index + 1,
          }))
        : Array.isArray(draft[field.name])
          ? draft[field.name]
          : [];
    }
  });

  return draft;
}

function buildPayload(config, draft) {
  const payload = {};

  config.fields.forEach((field) => {
    if (field.hidden || (field.visible && !field.visible(draft))) return;
    if (field.type === "file") return;
    if (field.name === "password" && !draft[field.name]) return;

    let value = draft[field.name];
    if (field.phone) value = normalizePhone(value);
    if (field.trim && typeof value === "string") value = value.trim();
    if (field.type === "datetime-local") value = value ? new Date(value).toISOString() : null;
    if (["number"].includes(field.type) && value === "") value = null;
    payload[field.name] = value ?? "";
  });

  if (config.key === "ofertas") {
    if (draft.tipo === "paquete") payload.productos_ids = [];
    else payload.paquete = null;
  }
  if (config.key === "descuentos" && draft.alcance === "todos") {
    payload.productos_ids = [];
  }

  return payload;
}

function makeFormData(payload, files) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    formData.append(key, typeof value === "boolean" ? String(value) : value);
  });
  Object.entries(files).forEach(([key, value]) => {
    if (value instanceof File) formData.append(key, value);
  });
  return formData;
}

function OptionChecklist({ field, options, value, onChange }) {
  const [query, setQuery] = useState("");
  const selected = new Set((value || []).map(Number));
  const filtered = options.filter((item) =>
    `${item.nombre || ""} ${item.codigo || ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className={styles.optionPicker}>
      <div className={styles.optionSearch}>
        <Search size={15} />
        <input
          aria-label={`Buscar en ${field.label}`}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar articulo"
          value={query}
        />
      </div>
      <div className={styles.optionList}>
        {filtered.map((option) => (
          <label key={option.id} className={styles.optionRow}>
            <input
              checked={selected.has(Number(option.id))}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(Number(option.id));
                else next.delete(Number(option.id));
                onChange([...next]);
              }}
              type="checkbox"
            />
            <span>
              <strong>{option.nombre}</strong>
              <small>{option.codigo || option.codigo_interno || option.categoria_nombre}</small>
            </span>
          </label>
        ))}
        {filtered.length === 0 ? <p className={styles.emptyPicker}>No hay coincidencias.</p> : null}
      </div>
      <small className={styles.selectionCount}>{selected.size} seleccionados</small>
    </div>
  );
}

function ProductBuilder({ options, value, onChange }) {
  const [query, setQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const selected = value || [];
  const selectedIds = new Set(selected.map((item) => Number(item.producto_id)));
  const normalizedQuery = normalizeSearchValue(query);
  const availableOptions = options.filter(
    (option) => !selectedIds.has(Number(option.id)),
  );
  const matchingOptions = availableOptions.filter((option) =>
    normalizeSearchValue(
      `${option.nombre || ""} ${option.codigo || ""} ${option.codigo_interno || ""}`,
    ).includes(normalizedQuery),
  );
  const visibleOptions = matchingOptions.slice(0, 60);

  function addProduct(productId) {
    if (!productId || selectedIds.has(Number(productId))) return;
    onChange([
      ...selected,
      { producto_id: Number(productId), cantidad: 1, orden: selected.length + 1 },
    ]);
    setQuery("");
    setIsPickerOpen(false);
  }

  return (
    <div className={styles.productBuilder}>
      <div
        className={styles.productBuilderPicker}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPickerOpen(false);
          }
        }}
      >
        <div className={styles.productBuilderSearch}>
          <Search size={16} aria-hidden="true" />
          <input
            aria-expanded={isPickerOpen}
            aria-haspopup="listbox"
            aria-label="Buscar producto para agregar"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setIsPickerOpen(true);
            }}
            onFocus={() => setIsPickerOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsPickerOpen(false);
                event.currentTarget.blur();
              }
            }}
            placeholder="Buscar producto por nombre o codigo"
            role="combobox"
            type="search"
            value={query}
          />
        </div>

        {isPickerOpen ? (
          <div className={styles.productBuilderResults} role="listbox">
            {visibleOptions.map((option) => (
              <button
                className={styles.productBuilderOption}
                key={option.id}
                onClick={() => addProduct(option.id)}
                aria-selected="false"
                role="option"
                type="button"
              >
                <strong>{option.nombre}</strong>
                <small>
                  {option.codigo || option.codigo_interno || "Sin codigo"}
                  {option.categoria_nombre ? ` - ${option.categoria_nombre}` : ""}
                </small>
              </button>
            ))}

            {matchingOptions.length === 0 ? (
              <p className={styles.emptyPicker}>
                {availableOptions.length === 0
                  ? "Todos los productos ya fueron agregados."
                  : "No hay productos que coincidan con la busqueda."}
              </p>
            ) : null}

            {matchingOptions.length > visibleOptions.length ? (
              <small className={styles.productBuilderResultMeta}>
                Mostrando {visibleOptions.length} de {matchingOptions.length}. Escribe
                mas letras para precisar la busqueda.
              </small>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.productBuilderRows}>
        {selected.map((item, index) => {
          const product = options.find((option) => Number(option.id) === Number(item.producto_id));
          return (
            <div className={styles.productBuilderRow} key={item.producto_id}>
              <span><strong>{product?.nombre || `Producto ${item.producto_id}`}</strong><small>{product?.codigo}</small></span>
              <label>Cantidad<input min="1" type="number" value={item.cantidad} onChange={(event) => onChange(selected.map((entry, entryIndex) => entryIndex === index ? { ...entry, cantidad: Math.max(1, Number(event.target.value) || 1) } : entry))} /></label>
              <button aria-label={`Quitar ${product?.nombre || "producto"}`} onClick={() => onChange(selected.filter((_, entryIndex) => entryIndex !== index).map((entry, entryIndex) => ({ ...entry, orden: entryIndex + 1 })))} title="Quitar producto" type="button"><X size={16} /></button>
            </div>
          );
        })}
        {selected.length === 0 ? <p className={styles.emptyPicker}>Agrega al menos un producto.</p> : null}
      </div>
    </div>
  );
}

function FormField({ context, draft, error, field, onChange, optionData }) {
  if (field.hidden || (field.visible && !field.visible(draft))) return null;
  const value = draft[field.name] ?? (field.type === "switch" ? false : "");
  let options = field.options || optionData[field.source] || [];

  if (field.filterBy && draft[field.filterBy.draftField]) {
    options = options.filter(
      (option) => Number(option[field.filterBy.field]) === Number(draft[field.filterBy.draftField]),
    );
  }

  if (field.type === "companySelect") {
    options = (context.empresas_disponibles || []).map((company) => ({
      value: company.id,
      label: company.nombre,
    }));
  } else if (field.type === "companyMultiSelect") {
    options = context.empresas_disponibles || [];
  }

  const inputId = `admin-field-${field.name}`;
  const wrapperClass = `${styles.formField} ${field.full ? styles.formFieldFull : ""}`;

  if (field.type === "switch") {
    return (
      <label className={`${wrapperClass} ${styles.switchField}`} htmlFor={inputId}>
        <span><strong>{field.label}</strong>{field.help ? <small>{field.help}</small> : null}</span>
        <input id={inputId} checked={Boolean(value)} onChange={(event) => onChange(field.name, event.target.checked)} type="checkbox" />
        <i aria-hidden="true" />
      </label>
    );
  }

  if (field.type === "multiSelect" || field.type === "companyMultiSelect") {
    return (
      <div className={wrapperClass}>
        <span className={styles.fieldLabel}>{field.label}</span>
        <OptionChecklist field={field} onChange={(next) => onChange(field.name, next)} options={options} value={value} />
        {error ? <small className={styles.fieldError}>{error}</small> : null}
      </div>
    );
  }

  if (field.type === "productBuilder") {
    return (
      <div className={wrapperClass}>
        <span className={styles.fieldLabel}>{field.label}</span>
        <ProductBuilder onChange={(next) => onChange(field.name, next)} options={options} value={value} />
        {error ? <small className={styles.fieldError}>{error}</small> : null}
      </div>
    );
  }

  return (
    <label className={wrapperClass} htmlFor={inputId}>
      <span className={styles.fieldLabel}>{field.label}{field.required || field.createRequired ? " *" : ""}</span>
      {field.type === "textarea" ? (
        <textarea id={inputId} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} required={field.required} rows="4" value={value} />
      ) : field.type === "select" || field.type === "companySelect" ? (
        <select id={inputId} onChange={(event) => onChange(field.name, event.target.value)} required={field.required} value={value}>
          <option value="">Seleccionar...</option>
          {options.map((option) => {
            const optionValue = option.value ?? option.id;
            const optionLabel = field.optionLabel?.(option) ?? option.label ?? option.nombre;
            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
      ) : field.type === "file" ? (
        <input accept={field.accept} id={inputId} onChange={(event) => onChange(field.name, event.target.files?.[0] || null)} type="file" />
      ) : (
        <input
          id={inputId}
          inputMode={field.inputMode}
          max={field.max}
          maxLength={field.maxLength}
          min={field.min}
          onChange={(event) =>
            onChange(
              field.name,
              field.phone ? normalizePhone(event.target.value) : event.target.value,
            )
          }
          pattern={field.pattern}
          placeholder={field.placeholder}
          required={field.required || (field.createRequired && !draft.id)}
          step={field.step}
          type={field.type || "text"}
          value={value}
        />
      )}
      {error ? <small className={styles.fieldError}>{error}</small> : null}
    </label>
  );
}

function DetailContent({ config, item }) {
  const fields = config.detailFields || [];

  function getDetailValue(key) {
    if (key === "metodo" || key === "metodo_pago") {
      return getAdminPaymentMethod(item?.[key]).label;
    }

    if (key === "estado" || key === "estado_pago") {
      return getAdminPaymentStatus(item?.[key], item).label;
    }

    return key.includes("fecha")
      ? formatDate(item?.[key])
      : String(item?.[key] ?? "-");
  }

  return (
    <div className={styles.detailContent}>
      {fields.map((key) => (
        <div key={key} className={["mensaje", "observaciones", "motivo_cancelacion"].includes(key) ? styles.detailWide : ""}>
          <span>{key.replaceAll("_", " ")}</span>
          <strong>{getDetailValue(key)}</strong>
        </div>
      ))}
      {Array.isArray(item?.detalles) ? (
        <section className={styles.orderLines}>
          <h3>{config.key === "pagos" ? "Articulos del pedido" : "Articulos"}</h3>
          {item.detalles.map((line) => (
            <div key={line.id}>
              <span><strong>{line.nombre_articulo}</strong><small>{line.codigo_articulo}</small></span>
              <span>{line.cantidad} x {currencyFormatter.format(Number(line.precio_unitario_final) || 0)}</span>
              <strong>{currencyFormatter.format(Number(line.subtotal_final) || 0)}</strong>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default function AdminResourcePage({ config, context, empresaSlug, onDataChanged, onNavigate }) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionData, setOptionData] = useState({});
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRelatedDetailLoading, setIsRelatedDetailLoading] = useState(false);
  const [relatedDetailError, setRelatedDetailError] = useState("");
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));

  async function loadItems() {
    if (!empresaSlug && config.key !== "empresas") return;
    setIsLoading(true);
    setError("");
    try {
      const payload = await listAdminResource(config.path, empresaSlug, {
        buscar: search,
        incluir_inactivos: includeInactive,
        paginar: true,
        page,
        tamano_pagina: pageSize,
        orden: config.order,
        ...(config.statusFilter && statusFilter
          ? { [config.statusFilter.param]: statusFilter }
          : {}),
      });
      const nextItems = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
      setItems(nextItems);
      setCount(Number(payload?.count) || nextItems.length);
    } catch (requestError) {
      setError(getErrorMessage(requestError, `No se pudieron cargar ${config.title.toLowerCase()}.`));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const routeParams = new URLSearchParams(window.location.search);
    const routeSearch = routeParams.get("buscar")?.trim() || "";
    const routeStatus = config.statusFilter
      ? routeParams.get(config.statusFilter.param)?.trim() || ""
      : "";
    setPage(1);
    setStatusFilter(routeStatus);
    setSearch(routeSearch);
    setSearchDraft(routeSearch);
    setSuccessMessage("");
  }, [empresaSlug, config.key]);

  useEffect(() => {
    loadItems();
  }, [config.key, empresaSlug, includeInactive, page, search, statusFilter]);

  useEffect(() => {
    let active = true;
    const dependencies = config.dependencies || [];
    if (!empresaSlug || dependencies.length === 0) {
      setOptionData({});
      return undefined;
    }

    Promise.all(
      dependencies.map(async (source) => {
        const sourceConfig = {
          familias: "/catalogo/familias/",
          categorias: "/catalogo/categorias/",
          productos: "/catalogo/productos/",
          paquetes: "/catalogo/paquetes/",
          departamentos: "/ubicaciones/departamentos/",
          municipios: "/ubicaciones/municipios/",
        }[source];
        const records = await listAllAdminResource(sourceConfig, empresaSlug, {
          incluir_inactivos: false,
          orden: "nombre",
        });
        return [source, records];
      }),
    )
      .then((entries) => {
        if (active) setOptionData(Object.fromEntries(entries));
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, "No se pudieron cargar las opciones del formulario."));
      });

    return () => {
      active = false;
    };
  }, [config.key, empresaSlug]);

  async function openEditor(item = null) {
    setFieldErrors({});
    setIsRelatedDetailLoading(false);
    setRelatedDetailError("");
    setDraft(getInitialDraft(config, item, optionData));
    setEditor({ mode: item ? (config.readOnly ? "detail" : "edit") : "create", item });

    if (!item || config.key !== "pagos" || Array.isArray(item.detalles)) return;

    setIsRelatedDetailLoading(true);
    const paymentReference = item.referencia;

    try {
      let orderId = typeof item.pedido === "object" ? item.pedido?.id : item.pedido;

      if (!orderId && item.pedido_numero) {
        const payload = await listAdminResource("/pedidos/pedidos/", empresaSlug, {
          buscar: item.pedido_numero,
          paginar: true,
          page: 1,
          tamano_pagina: 10,
        });
        const candidates = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
        const matchingOrder = candidates.find((order) => order.numero === item.pedido_numero) || candidates[0];
        orderId = matchingOrder?.id;
      }

      if (!orderId) {
        throw new Error("El pago no incluye un pedido relacionado.");
      }

      const order = await getAdminResourceDetail("/pedidos/pedidos/", orderId, empresaSlug);
      setEditor((current) => {
        if (current?.item?.referencia !== paymentReference) return current;
        return {
          ...current,
          item: {
            ...current.item,
            detalles: Array.isArray(order?.detalles) ? order.detalles : [],
          },
        };
      });
    } catch (requestError) {
      setRelatedDetailError(
        getErrorMessage(requestError, "No se pudieron cargar los articulos de este pedido."),
      );
    } finally {
      setIsRelatedDetailLoading(false);
    }
  }

  function closeEditor() {
    if (isSaving) return;
    setEditor(null);
    setDraft({});
    setFieldErrors({});
    setIsRelatedDetailLoading(false);
    setRelatedDetailError("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setFieldErrors({});
    setError("");
    const payload = buildPayload(config, draft);
    if (
      context.usuario?.es_superusuario &&
      ["familias", "categorias", "productos", "banners", "ofertas", "descuentos"].includes(config.key)
    ) {
      payload.empresa = context.empresa_actual?.id;
    }
    const files = Object.fromEntries(
      config.fields.filter((field) => field.type === "file" && draft[field.name] instanceof File).map((field) => [field.name, draft[field.name]]),
    );

    try {
      const id = editor.item?.[config.rowId || "id"];
      let saved;
      const mustCreateWithFile = config.key === "banners" && !id && Object.keys(files).length > 0;

      if (mustCreateWithFile) {
        saved = await createAdminResource(config.path, empresaSlug, makeFormData(payload, files));
      } else if (id) {
        saved = await updateAdminResource(config.path, id, empresaSlug, payload);
      } else {
        saved = await createAdminResource(config.path, empresaSlug, payload);
      }

      if (!mustCreateWithFile && Object.keys(files).length > 0) {
        saved = await updateAdminResource(
          config.path,
          saved?.[config.rowId || "id"],
          empresaSlug,
          makeFormData({}, files),
        );
      }

      setEditor(null);
      setDraft({});
      setFieldErrors({});
      await loadItems();
      onDataChanged?.(config.key, saved);
    } catch (requestError) {
      setFieldErrors(getFieldErrors(requestError));
      setError(getErrorMessage(requestError, `No se pudo guardar la ${config.singular}.`));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(item) {
    const currentValue = Boolean(item[config.statusField]);
    setError("");
    try {
      if (config.statusActions) {
        await runAdminAction(
          config.path,
          item[config.rowId || "id"],
          currentValue ? config.statusActions.deactivate : config.statusActions.activate,
          empresaSlug,
        );
      } else {
        await updateAdminResource(
          config.path,
          item[config.rowId || "id"],
          empresaSlug,
          { [config.statusField]: !currentValue },
        );
      }
      await loadItems();
      onDataChanged?.(config.key);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No se pudo cambiar el estado."));
    }
  }

  function openCancellation(item) {
    setCancelTarget(item);
    setCancelReason("");
    setActionError("");
    setSuccessMessage("");
  }

  function openBranchConfirmation(item) {
    setConfirmTarget(item);
    setActionError("");
    setSuccessMessage("");
  }

  function manageBranchOrderPayment(item) {
    setEditor(null);
    onNavigate?.("pagos", { buscar: item?.numero || "", estado: "pendiente" });
  }

  function closeActionModal() {
    if (isActionRunning) return;
    setCancelTarget(null);
    setCancelReason("");
    setConfirmTarget(null);
    setActionError("");
  }

  async function handleCancelPendingOrder() {
    const reason = cancelReason.trim();
    if (!reason) {
      setActionError("Escribe el motivo de la cancelacion.");
      return;
    }

    setIsActionRunning(true);
    setActionError("");
    setError("");

    try {
      const result = await cancelPendingOrder(cancelTarget.id, reason);
      setCancelTarget(null);
      setCancelReason("");
      setEditor(null);
      await loadItems();
      setSuccessMessage(
        result?.duplicado
          ? "El pedido ya estaba cancelado. La auditoria fue conservada."
          : "Pedido pendiente cancelado correctamente.",
      );
      onDataChanged?.("pedidos", result);
      onDataChanged?.("pagos", result);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "No se pudo cancelar el pedido pendiente.",
      );

      if ([400, 404].includes(requestError?.status)) {
        setCancelTarget(null);
        setCancelReason("");
        setEditor(null);
        await loadItems();
        setError(message);
      } else {
        setActionError(message);
      }
    } finally {
      setIsActionRunning(false);
    }
  }

  async function handleConfirmBranchPayment() {
    setIsActionRunning(true);
    setActionError("");
    setError("");

    try {
      const result = await confirmBranchPayment(confirmTarget.referencia);
      setConfirmTarget(null);
      setEditor(null);
      await loadItems();
      setSuccessMessage(
        result?.duplicado
          ? "El cobro en sucursal ya estaba confirmado."
          : "Cobro en sucursal confirmado correctamente.",
      );
      onDataChanged?.("pagos", result);
      onDataChanged?.("pedidos", result);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        "No se pudo confirmar el cobro en sucursal.",
      );

      if ([400, 404].includes(requestError?.status)) {
        setConfirmTarget(null);
        setEditor(null);
        await loadItems();
        setError(message);
      } else {
        setActionError(message);
      }
    } finally {
      setIsActionRunning(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteAdminResource(config.path, deleteTarget[config.rowId || "id"], empresaSlug);
      setDeleteTarget(null);
      await loadItems();
      onDataChanged?.(config.key);
    } catch (requestError) {
      const conflictMessage = requestError?.status === 409
        ? "Este registro tiene historial relacionado. Desactivalo para conservar la informacion comercial."
        : `No se pudo eliminar la ${config.singular}.`;
      setError(getErrorMessage(requestError, conflictMessage));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const canCreate = config.canCreate !== false && !config.readOnly;
  const canDelete = config.canDelete !== false && !config.readOnly;

  return (
    <section className={styles.resourcePage}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Administracion</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {canCreate ? (
          <button className={styles.primaryButton} onClick={() => openEditor()} type="button">
            <Plus size={17} /> Crear {config.singular}
          </button>
        ) : null}
      </header>

      <div className={styles.tableToolbar}>
        <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()); }} className={styles.tableSearch}>
          <Search size={17} />
          <input aria-label={`Buscar ${config.title}`} onChange={(event) => setSearchDraft(event.target.value)} placeholder={`Buscar en ${config.title.toLowerCase()}`} value={searchDraft} />
          {searchDraft ? <button aria-label="Limpiar busqueda" onClick={() => { setSearchDraft(""); setSearch(""); }} title="Limpiar" type="button"><X size={16} /></button> : null}
        </form>
        {config.statusField && !config.readOnly ? (
          <label className={styles.compactToggle}>
            <input checked={includeInactive} onChange={(event) => { setPage(1); setIncludeInactive(event.target.checked); }} type="checkbox" />
            Mostrar inactivos
          </label>
        ) : null}
        {config.statusFilter ? (
          <label className={styles.compactSelect}>
            <span>{config.statusFilter.label}</span>
            <select
              aria-label={config.statusFilter.label}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              value={statusFilter}
            >
              {config.statusFilter.options.map((option) => (
                <option key={option.value || "todos"} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ) : null}
        <span className={styles.resultCount}>{count} registros</span>
      </div>

      {error ? <div className={styles.inlineError} role="alert"><CircleAlert size={18} /><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError("")} type="button"><X size={16} /></button></div> : null}
      {successMessage ? <div className={styles.successBanner} role="status"><BadgeCheck size={18} /><span>{successMessage}</span><button aria-label="Cerrar mensaje" onClick={() => setSuccessMessage("")} type="button"><X size={16} /></button></div> : null}

      <div className={styles.tableFrame}>
        {isLoading ? (
          <div className={styles.loadingState}><LoaderCircle className={styles.spin} size={24} /><strong>Cargando {config.title.toLowerCase()}</strong></div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <Search size={28} />
            <strong>No hay resultados</strong>
            <p>{search ? "Prueba con otro termino de busqueda." : `Todavia no hay ${config.title.toLowerCase()} registrados.`}</p>
            {canCreate ? <button className={styles.secondaryButton} onClick={() => openEditor()} type="button"><Plus size={16} /> Crear el primero</button> : null}
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th><span className={styles.srOnly}>Acciones</span></th></tr></thead>
              <tbody>
                {items.map((item) => {
                  const rowId = item[config.rowId || "id"];
                  return (
                    <tr key={rowId} onDoubleClick={() => openEditor(item)}>
                      {config.columns.map((column) => <td key={column.key} data-label={column.label}><CellValue column={column} item={item} /></td>)}
                      <td className={styles.rowActions}>
                        <button aria-label={config.readOnly ? "Ver detalle" : "Editar"} onClick={() => openEditor(item)} title={config.readOnly ? "Ver detalle" : "Editar"} type="button">{config.readOnly ? <Search size={17} /> : <Edit3 size={17} />}</button>
                        {canManageBranchOrderPayment(config, item) ? <button aria-label="Ir a confirmar pago en sucursal" className={styles.confirmIconButton} onClick={() => manageBranchOrderPayment(item)} title="Ir a confirmar pago en sucursal" type="button"><BadgeCheck size={17} /></button> : null}
                        {canConfirmBranchPayment(config, item) ? <button aria-label="Confirmar cobro en sucursal" className={styles.confirmIconButton} onClick={() => openBranchConfirmation(item)} title="Confirmar cobro en sucursal" type="button"><BadgeCheck size={17} /></button> : null}
                        {canCancelPendingOrder(config, item) ? <button aria-label="Cancelar pedido pendiente" className={styles.dangerIconButton} onClick={() => openCancellation(item)} title="Cancelar pedido pendiente" type="button"><Ban size={17} /></button> : null}
                        {config.statusField && config.statusToggle !== false && !config.readOnly && config.key !== "contactos" ? <button aria-label={item[config.statusField] ? "Desactivar" : "Activar"} onClick={() => toggleStatus(item)} title={item[config.statusField] ? "Desactivar" : "Activar"} type="button"><Power size={17} /></button> : null}
                        {canDelete ? <button aria-label="Eliminar" className={styles.dangerIconButton} onClick={() => setDeleteTarget(item)} title="Eliminar" type="button"><Trash2 size={17} /></button> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <nav aria-label="Paginacion" className={styles.pagination}>
          <button aria-label="Pagina anterior" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button"><ChevronLeft size={17} /></button>
          <span>Pagina <strong>{page}</strong> de {pageCount}</span>
          <button aria-label="Pagina siguiente" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} type="button"><ChevronRight size={17} /></button>
        </nav>
      ) : null}

      {editor ? (
        <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
          <aside aria-label={`${editor.mode === "create" ? "Crear" : editor.mode === "detail" ? "Detalle de" : "Editar"} ${config.singular}`} className={styles.editorDrawer}>
            <header className={styles.drawerHeader}>
              <div><span>{editor.mode === "create" ? "Nuevo registro" : editor.mode === "detail" ? "Detalle" : "Edicion"}</span><h2>{editor.mode === "create" ? `Crear ${config.singular}` : displayName(editor.item)}</h2></div>
              <button aria-label="Cerrar" onClick={closeEditor} title="Cerrar" type="button"><X size={20} /></button>
            </header>
            {editor.mode === "detail" ? (
              <div className={styles.readOnlyDrawerBody}>
                <DetailContent config={config} item={editor.item} />
                {isRelatedDetailLoading ? <div className={styles.relatedDetailState}><LoaderCircle className={styles.spin} size={18} /> Cargando articulos del pedido</div> : null}
                {relatedDetailError ? <div className={`${styles.relatedDetailState} ${styles.relatedDetailError}`} role="alert"><CircleAlert size={18} /> {relatedDetailError}</div> : null}
                <footer className={styles.drawerFooter}>
                  <button className={styles.secondaryButton} onClick={closeEditor} type="button">Cerrar</button>
                  {canManageBranchOrderPayment(config, editor.item) ? <button className={styles.primaryButton} onClick={() => manageBranchOrderPayment(editor.item)} type="button"><BadgeCheck size={17} /> Ir a confirmar pago</button> : null}
                  {canConfirmBranchPayment(config, editor.item) ? <button className={styles.primaryButton} onClick={() => openBranchConfirmation(editor.item)} type="button"><BadgeCheck size={17} /> Confirmar cobro</button> : null}
                  {canCancelPendingOrder(config, editor.item) ? <button className={styles.dangerButton} onClick={() => openCancellation(editor.item)} type="button"><Ban size={17} /> Cancelar pendiente</button> : null}
                </footer>
              </div>
            ) : (
              <form className={styles.editorForm} onSubmit={handleSave}>
                {config.detailFields && editor.item ? <DetailContent config={config} item={editor.item} /> : null}
                <div className={styles.formGrid}>
                  {config.fields.map((field) => <FormField context={context} draft={draft} error={fieldErrors[field.name]} field={field} key={field.name} onChange={(name, value) => setDraft((current) => ({ ...current, [name]: value }))} optionData={optionData} />)}
                </div>
                <footer className={styles.drawerFooter}>
                  <button className={styles.secondaryButton} disabled={isSaving} onClick={closeEditor} type="button">Cancelar</button>
                  <button className={styles.primaryButton} disabled={isSaving} type="submit">{isSaving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />} Guardar cambios</button>
                </footer>
              </form>
            )}
          </aside>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className={styles.modalLayer} role="presentation">
          <div aria-labelledby="delete-title" aria-modal="true" className={styles.confirmDialog} role="dialog">
            <span className={styles.dangerMark}><Trash2 size={21} /></span>
            <h2 id="delete-title">Eliminar {config.singular}</h2>
            <p>Se eliminara <strong>{displayName(deleteTarget)}</strong>. Si tiene historial relacionado, el servidor impedira la operacion.</p>
            <div><button className={styles.secondaryButton} disabled={isDeleting} onClick={() => setDeleteTarget(null)} type="button">Cancelar</button><button className={styles.dangerButton} disabled={isDeleting} onClick={confirmDelete} type="button">{isDeleting ? <LoaderCircle className={styles.spin} size={17} /> : <Trash2 size={17} />} Eliminar</button></div>
          </div>
        </div>
      ) : null}

      {cancelTarget ? (
        <div className={styles.modalLayer} role="presentation">
          <div aria-labelledby="cancel-order-title" aria-modal="true" className={styles.confirmDialog} role="dialog">
            <span className={styles.dangerMark}><Ban size={21} /></span>
            <h2 id="cancel-order-title">Cancelar pedido pendiente</h2>
            <p>
              Pedido <strong>{displayName(cancelTarget)}</strong> por <strong>{currencyFormatter.format(Number(cancelTarget.total) || 0)}</strong>.
              Esta accion quedara registrada en la auditoria.
            </p>
            <label className={styles.actionReason}>
              <span>Motivo de cancelacion</span>
              <textarea
                disabled={isActionRunning}
                maxLength={500}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                  if (actionError) setActionError("");
                }}
                placeholder="Explica por que se cancela el pedido"
                required
                value={cancelReason}
              />
            </label>
            {actionError ? <p className={styles.modalError} role="alert">{actionError}</p> : null}
            <div>
              <button className={styles.secondaryButton} disabled={isActionRunning} onClick={closeActionModal} type="button">Volver</button>
              <button className={styles.dangerButton} disabled={isActionRunning || !cancelReason.trim()} onClick={handleCancelPendingOrder} type="button">{isActionRunning ? <LoaderCircle className={styles.spin} size={17} /> : <Ban size={17} />} Confirmar cancelacion</button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmTarget ? (
        <div className={styles.modalLayer} role="presentation">
          <div aria-labelledby="confirm-payment-title" aria-modal="true" className={styles.confirmDialog} role="dialog">
            <span className={styles.successMark}><BadgeCheck size={21} /></span>
            <h2 id="confirm-payment-title">Confirmar cobro en sucursal</h2>
            <p>
              Se confirmara la referencia <strong>{confirmTarget.referencia}</strong> por <strong>{currencyFormatter.format(Number(confirmTarget.monto) || 0)}</strong>.
              Verifica que el pago haya sido recibido antes de continuar.
            </p>
            {actionError ? <p className={styles.modalError} role="alert">{actionError}</p> : null}
            <div>
              <button className={styles.secondaryButton} disabled={isActionRunning} onClick={closeActionModal} type="button">Volver</button>
              <button className={styles.primaryButton} disabled={isActionRunning} onClick={handleConfirmBranchPayment} type="button">{isActionRunning ? <LoaderCircle className={styles.spin} size={17} /> : <BadgeCheck size={17} />} Confirmar cobro</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
