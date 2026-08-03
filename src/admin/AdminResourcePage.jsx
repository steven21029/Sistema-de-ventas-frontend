import { useEffect, useState } from "react";
import {
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
  createAdminResource,
  deleteAdminResource,
  listAdminResource,
  listAllAdminResource,
  runAdminAction,
  updateAdminResource,
} from "../services/adminService";
import { resolveMediaUrl } from "../services/apiClient";
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
  const payload = error?.payload;
  if (typeof payload === "string") return payload;
  if (payload?.detail) return payload.detail;
  if (payload?.detalle) return payload.detalle;

  if (payload && typeof payload === "object") {
    const firstEntry = Object.entries(payload)[0];
    if (firstEntry) {
      const [field, value] = firstEntry;
      const message = Array.isArray(value) ? value.join(" ") : String(value);
      return `${field}: ${message}`;
    }
  }

  return error?.message || fallback;
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

function getStatusLabel(value, type) {
  if (type === "contactStatus") {
    return { nuevo: "Nuevo", pendiente: "Pendiente", respondido: "Respondido" }[value] || value;
  }
  if (type === "paymentStatus") {
    return {
      pendiente: "Pendiente",
      aprobado: "Aprobado",
      pagado: "Pagado",
      rechazado: "Rechazado",
      cancelado: "Cancelado",
    }[value] || value;
  }
  return value ? "Activo" : "Inactivo";
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
    return (
      <span className={`${styles.status} ${styles[`status_${String(statusValue)}`] || ""}`}>
        <span />
        {getStatusLabel(statusValue, column.type)}
      </span>
    );
  }

  if (column.type === "verified") {
    return <span className={value ? styles.verified : styles.unverified}>{value ? "Verificado" : "Pendiente"}</span>;
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
  const selected = value || [];
  const selectedIds = new Set(selected.map((item) => Number(item.producto_id)));

  function addProduct(productId) {
    if (!productId || selectedIds.has(Number(productId))) return;
    onChange([
      ...selected,
      { producto_id: Number(productId), cantidad: 1, orden: selected.length + 1 },
    ]);
  }

  return (
    <div className={styles.productBuilder}>
      <select aria-label="Agregar producto" onChange={(event) => { addProduct(event.target.value); event.target.value = ""; }} defaultValue="">
        <option value="">Agregar un producto...</option>
        {options.filter((option) => !selectedIds.has(Number(option.id))).map((option) => (
          <option key={option.id} value={option.id}>{option.nombre} ({option.codigo})</option>
        ))}
      </select>
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
            const optionLabel = option.label ?? option.nombre;
            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
      ) : field.type === "file" ? (
        <input accept={field.accept} id={inputId} onChange={(event) => onChange(field.name, event.target.files?.[0] || null)} type="file" />
      ) : (
        <input
          id={inputId}
          max={field.max}
          min={field.min}
          onChange={(event) => onChange(field.name, event.target.value)}
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
  return (
    <div className={styles.detailContent}>
      {fields.map((key) => (
        <div key={key} className={key === "mensaje" || key === "observaciones" ? styles.detailWide : ""}>
          <span>{key.replaceAll("_", " ")}</span>
          <strong>{key.includes("fecha") ? formatDate(item?.[key]) : String(item?.[key] ?? "-")}</strong>
        </div>
      ))}
      {Array.isArray(item?.detalles) ? (
        <section className={styles.orderLines}>
          <h3>Articulos</h3>
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

export default function AdminResourcePage({ config, context, empresaSlug, onDataChanged }) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionData, setOptionData] = useState({});
  const [editor, setEditor] = useState(null);
  const [draft, setDraft] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setPage(1);
  }, [empresaSlug, config.key]);

  useEffect(() => {
    loadItems();
  }, [config.key, empresaSlug, includeInactive, page, search]);

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

  function openEditor(item = null) {
    setFieldErrors({});
    setDraft(getInitialDraft(config, item, optionData));
    setEditor({ mode: item ? (config.readOnly ? "detail" : "edit") : "create", item });
  }

  function closeEditor() {
    if (isSaving) return;
    setEditor(null);
    setDraft({});
    setFieldErrors({});
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
        <span className={styles.resultCount}>{count} registros</span>
      </div>

      {error ? <div className={styles.inlineError} role="alert"><CircleAlert size={18} /><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError("")} type="button"><X size={16} /></button></div> : null}

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
                        {config.statusField && !config.readOnly && config.key !== "contactos" ? <button aria-label={item[config.statusField] ? "Desactivar" : "Activar"} onClick={() => toggleStatus(item)} title={item[config.statusField] ? "Desactivar" : "Activar"} type="button"><Power size={17} /></button> : null}
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
            {editor.mode === "detail" ? <DetailContent config={config} item={editor.item} /> : (
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
    </section>
  );
}
