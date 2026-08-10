import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Boxes,
  ClipboardList,
  CreditCard,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Mail,
  PackageCheck,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";
import {
  downloadSalesReport,
  getInventorySummary,
  getSalesSummary,
  listAdminResource,
} from "../services/adminService";
import { getAdminPaymentMethod } from "../utils/paymentStatus";
import { getApiErrorMessage } from "../utils/apiError";
import { asArray } from "../services/apiClient";
import styles from "./AdminApp.module.css";

const money = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});
const compactMoney = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  maximumFractionDigits: 1,
  notation: "compact",
});
const monthFormatter = new Intl.DateTimeFormat("es-HN", { month: "short" });
const reportDateFormatter = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const PAID_STATES = new Set([
  "aprobado",
  "confirmada",
  "confirmadas",
  "confirmado",
  "confirmados",
  "pagado",
]);
const PENDING_STATES = new Set(["pendiente", "pendientes"]);
const REJECTED_STATES = new Set([
  "cancelada",
  "canceladas",
  "cancelado",
  "cancelados",
  "rechazada",
  "rechazadas",
  "rechazado",
  "rechazados",
]);

const REPORT_TYPES = [
  { value: "resumen", label: "Resumen" },
  { value: "ventas", label: "Ventas" },
  { value: "pagos", label: "Pagos" },
  { value: "impuestos", label: "Impuestos" },
];

const REPORT_FORMATS = [
  { value: "pdf", label: "PDF" },
  { value: "xlsx", label: "Excel (XLSX)" },
  { value: "csv", label: "CSV" },
];

const REPORT_PERIODS = [
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
];

function countFrom(payload) {
  if (Number.isFinite(Number(payload?.count))) return Number(payload.count);
  return asArray(payload).length;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateParam(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateInput(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function addMonthsClamped(date, amount) {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

function getReportEndDate(startDate, period) {
  if (!startDate) return null;
  if (period === "semanal") return addDays(startDate, 6);
  if (period === "quincenal") return addDays(startDate, 14);

  return addDays(addMonthsClamped(startDate, 1), -1);
}

function getLatestReportStart(period, today = new Date()) {
  if (period === "semanal") return addDays(today, -6);
  if (period === "quincenal") return addDays(today, -14);

  return addMonthsClamped(addDays(today, 1), -1);
}

function getPreviousMonthStart() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - 1, 1);
}

function getMonthRangeStart(monthCount) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - (monthCount - 1));
  return date;
}

function numberFrom(source, ...keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function formatDecimalMoney(value) {
  const match = String(value ?? "0.00").trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return "L 0.00";

  const integer = match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = String(match[3] || "").padEnd(2, "0").slice(0, 2);
  return `${match[1] ? "-" : ""}L ${integer}.${fraction}`;
}

function trendFromPercentage(value) {
  if (value === null || value === undefined || value === "") {
    return { direction: "neutral", label: "Sin comparacion disponible" };
  }

  const percentage = Number(value);
  if (!Number.isFinite(percentage)) {
    return { direction: "neutral", label: "Sin comparacion disponible" };
  }

  return {
    direction: percentage > 0 ? "up" : percentage < 0 ? "down" : "neutral",
    label: `${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}% vs. mes anterior`,
  };
}

function getTrend(summaryPayload, metric) {
  const summary = summaryPayload?.resumen || {};
  const comparison =
    summaryPayload?.comparacion_periodo_anterior || summaryPayload?.comparacion || {};
  const isRevenue = metric === "revenue";
  const keys = isRevenue
    ? [
        "variacion_ingresos_porcentaje",
        "porcentaje_variacion_ingresos",
        "variacion_porcentual_ingresos",
      ]
    : [
        "variacion_ventas_porcentaje",
        "porcentaje_variacion_ventas",
        "variacion_porcentual_ventas",
      ];

  for (const source of [summary, comparison]) {
    for (const key of keys) {
      if (source?.[key] !== null && source?.[key] !== undefined) {
        return trendFromPercentage(source[key]);
      }
    }
  }

  return trendFromPercentage(null);
}

function normalizeMonthSeries(payload, monthCount = 6) {
  const entries = new Map(
    asArray(payload?.serie).map((entry) => {
      const rawPeriod = String(entry.periodo || entry.mes || entry.fecha || "");
      return [rawPeriod.slice(0, 7), entry];
    }),
  );
  const now = new Date();
  const series = [];

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    const entry = entries.get(key) || {};

    series.push({
      key,
      label:
        entry.etiqueta || entry.label || monthFormatter.format(date).replace(".", ""),
      revenue: numberFrom(
        entry,
        "ingresos_confirmados",
        "ingresos",
        "monto_confirmado",
        "total",
      ),
      sales: numberFrom(
        entry,
        "ventas_confirmadas",
        "ventas",
        "cantidad_ventas",
        "cantidad",
      ),
    });
  }

  return series;
}

function statusGroup(value) {
  const status = normalizeStatus(value);
  if (PAID_STATES.has(status)) return "paid";
  if (PENDING_STATES.has(status)) return "pending";
  if (REJECTED_STATES.has(status)) return "rejected";
  return "other";
}

function buildStatusBreakdown(payload, summary, pendingMethods) {
  const counts = new Map();

  asArray(payload?.estados).forEach((entry) => {
    const group = statusGroup(entry.estado || entry.estado_pago || entry.nombre);
    const count = numberFrom(entry, "cantidad", "pedidos", "total");
    if (group === "pending" && pendingMethods.available) return;
    counts.set(group, (counts.get(group) || 0) + count);
  });

  const paid = numberFrom(summary, "ventas_confirmadas");
  const pending = numberFrom(summary, "pedidos_pendientes");
  if (!counts.has("paid") && paid > 0) counts.set("paid", paid);

  if (pendingMethods.available) {
    if (pendingMethods.branch.count > 0) counts.set("branchPending", pendingMethods.branch.count);
    if (pendingMethods.online.count > 0) counts.set("onlinePending", pendingMethods.online.count);
    if (pendingMethods.noMethod.count > 0) counts.set("noMethod", pendingMethods.noMethod.count);
  } else if (!counts.has("pending") && pending > 0) {
    counts.set("pending", pending);
  }

  const labels = {
    paid: "Confirmadas",
    pending: "Pendientes",
    branchPending: "Por cobrar en sucursal",
    onlinePending: "Esperando pago en linea",
    noMethod: "Sin metodo de pago",
    rejected: "Rechazadas",
    other: "Otros estados",
  };
  const amounts = {
    branchPending: pendingMethods.branch.amount,
    onlinePending: pendingMethods.online.amount,
    noMethod: pendingMethods.noMethod.amount,
  };

  return ["paid", "branchPending", "onlinePending", "noMethod", "pending", "rejected", "other"]
    .filter((key) => (counts.get(key) || 0) > 0)
    .map((key) => ({ key, label: labels[key], count: counts.get(key), amount: amounts[key] }));
}

function normalizeTopProducts(payload) {
  return asArray(payload?.productos_mas_vendidos)
    .map((product, index) => ({
      id: product.id || product.producto_id || product.codigo || index,
      name:
        product.nombre || product.producto_nombre || product.producto || "Producto",
      units: numberFrom(
        product,
        "cantidad",
        "unidades_vendidas",
        "total_vendido",
      ),
      revenue: numberFrom(
        product,
        "ingresos",
        "ingresos_confirmados",
        "monto_total",
        "total",
      ),
    }))
    .slice(0, 5);
}

function normalizePaymentMethods(payload, summary) {
  const methods = summary?.pagos_por_metodo || payload?.pagos_por_metodo || {};

  function getMethod(method) {
    const entry = methods?.[method] || {};
    return {
      amount: numberFrom(entry, "monto", "monto_total", "total"),
      count: numberFrom(entry, "cantidad", "pagos", "total_pagos"),
    };
  }

  return {
    branch: getMethod("sucursal"),
    online: getMethod("en_linea"),
  };
}

function normalizePendingMethods(payload, summary) {
  const methods = summary?.pendientes_por_metodo || payload?.pendientes_por_metodo;

  function getMethod(method) {
    const entry = methods?.[method] || {};
    return {
      amount: String(entry?.monto ?? "0.00"),
      count: numberFrom(entry, "cantidad", "pedidos", "total_pedidos"),
    };
  }

  const branch = getMethod("sucursal");
  const online = getMethod("en_linea");
  const noMethod = getMethod("sin_metodo");

  return {
    available: Boolean(methods && typeof methods === "object"),
    branch,
    online,
    noMethod,
    totalCount: branch.count + online.count + noMethod.count,
  };
}

function formatApprovedPaymentCount(count) {
  return `${count} ${count === 1 ? "pago aprobado" : "pagos aprobados"}`;
}

function buildSalesAnalytics(currentPayload, rangePayload) {
  const current = currentPayload?.resumen || {};
  const range = rangePayload?.resumen || {};
  const monthSeries = normalizeMonthSeries(rangePayload);
  const paymentMethods = normalizePaymentMethods(currentPayload, current);
  const pendingMethods = normalizePendingMethods(currentPayload, current);
  const statusBreakdown = buildStatusBreakdown(currentPayload, current, pendingMethods);
  const rangeRevenueFromSeries = monthSeries.reduce(
    (total, entry) => total + entry.revenue,
    0,
  );
  const rangeSalesFromSeries = monthSeries.reduce(
    (total, entry) => total + entry.sales,
    0,
  );

  return {
    averageTicket: numberFrom(current, "ticket_promedio"),
    monthSeries,
    paymentMethods,
    pendingMethods,
    revenue: numberFrom(current, "ingresos_confirmados"),
    revenueChange: getTrend(currentPayload, "revenue"),
    sales: numberFrom(current, "ventas_confirmadas"),
    salesChange: getTrend(currentPayload, "sales"),
    statusBreakdown,
    totalCurrentOrders: statusBreakdown.reduce(
      (total, entry) => total + entry.count,
      0,
    ),
    rangeRevenue:
      numberFrom(range, "ingresos_confirmados") || rangeRevenueFromSeries,
    rangeSales: numberFrom(range, "ventas_confirmadas") || rangeSalesFromSeries,
    subtotal: numberFrom(range, "subtotal"),
    discounts: numberFrom(range, "descuentos"),
    taxes: numberFrom(range, "impuestos"),
    shipping: numberFrom(range, "envios"),
    topProducts: normalizeTopProducts(rangePayload),
  };
}

function getErrorMessage(error, fallback) {
  return getApiErrorMessage(error, fallback);
}

function saveFile(blob, filename) {
  const safeFilename = String(filename || "reporte").replace(/[\\/:*?"<>|]/g, "-");
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function AdminDashboard({ context, empresaSlug, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportFilters, setReportFilters] = useState(() => ({
    fecha_desde: formatDateParam(getPreviousMonthStart()),
    periodo: "mensual",
    tipo: "resumen",
    formato: "pdf",
  }));
  const [downloadState, setDownloadState] = useState({
    status: "idle",
    message: "",
  });
  const company = context.empresa_actual;

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadDashboard() {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const rangeStart = getMonthRangeStart(6);
      const requests = [
        listAdminResource("/catalogo/productos/", empresaSlug, {
          paginar: true,
          page: 1,
          tamano_pagina: 1,
          incluir_inactivos: false,
        }),
        listAdminResource("/usuarios/administracion/", empresaSlug, {
          page: 1,
          tamano_pagina: 1,
          activo: true,
        }),
        getSalesSummary(empresaSlug, {
          fecha_desde: formatDateParam(currentMonthStart),
          fecha_hasta: formatDateParam(now),
          agrupacion: "dia",
          comparar_periodo_anterior: true,
        }),
        getSalesSummary(empresaSlug, {
          fecha_desde: formatDateParam(rangeStart),
          fecha_hasta: formatDateParam(now),
          agrupacion: "mes",
          comparar_periodo_anterior: false,
        }),
        listAdminResource("/pedidos/pedidos/", empresaSlug, {
          paginar: true,
          page: 1,
          tamano_pagina: 5,
          orden: "-fecha_creacion",
        }),
        listAdminResource("/contacto/mensajes/", empresaSlug, {
          paginar: true,
          page: 1,
          tamano_pagina: 5,
          estado: "nuevo",
          orden: "-fecha_creacion",
        }),
        company.permite_productos_fisicos
          ? getInventorySummary(empresaSlug)
          : Promise.resolve(null),
      ];

      const [products, users, currentSummary, rangeSummary, orders, contacts, inventory] =
        await Promise.allSettled(requests);
      if (!active) return;

      setData({
        products: products.status === "fulfilled" ? products.value : null,
        users: users.status === "fulfilled" ? users.value : null,
        currentSummary:
          currentSummary.status === "fulfilled" ? currentSummary.value : null,
        rangeSummary: rangeSummary.status === "fulfilled" ? rangeSummary.value : null,
        orders: orders.status === "fulfilled" ? orders.value : null,
        contacts: contacts.status === "fulfilled" ? contacts.value : null,
        inventory: inventory.status === "fulfilled" ? inventory.value : null,
      });
      setLoading(false);
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [company.permite_productos_fisicos, empresaSlug]);

  function updateReportFilter(event) {
    const { name, value } = event.target;
    setReportFilters((current) => ({ ...current, [name]: value }));
    setDownloadState({ status: "idle", message: "" });
  }

  async function handleReportDownload(event) {
    event.preventDefault();
    const startDate = parseDateInput(reportFilters.fecha_desde);
    const endDate = getReportEndDate(startDate, reportFilters.periodo);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!startDate || !endDate) {
      setDownloadState({
        status: "error",
        message: "Selecciona una fecha inicial valida.",
      });
      return;
    }

    if (startDate > today || endDate > today) {
      setDownloadState({
        status: "error",
        message: "El periodo seleccionado incluye fechas futuras.",
      });
      return;
    }

    setDownloadState({ status: "loading", message: "Preparando reporte..." });
    try {
      const result = await downloadSalesReport(empresaSlug, {
        fecha_desde: formatDateParam(startDate),
        fecha_hasta: formatDateParam(endDate),
        tipo: reportFilters.tipo,
        formato: reportFilters.formato,
      });
      if (!(result.blob instanceof Blob) || result.blob.size === 0) {
        throw new Error("El servidor devolvio un archivo vacio.");
      }
      saveFile(result.blob, result.filename);
      setDownloadState({
        status: "success",
        message: `Reporte descargado: ${result.filename}`,
      });
    } catch (error) {
      setDownloadState({
        status: "error",
        message: getErrorMessage(error, "No se pudo descargar el reporte."),
      });
    }
  }

  if (loading) {
    return (
      <div className={styles.fullPageLoading}>
        <LoaderCircle className={styles.spin} size={25} />
        <strong>Preparando el resumen de la empresa</strong>
      </div>
    );
  }

  const recentOrders = [...asArray(data?.orders)]
    .sort(
      (first, second) =>
        (parseDate(second.fecha_creacion)?.getTime() || 0) -
        (parseDate(first.fecha_creacion)?.getTime() || 0),
    )
    .slice(0, 5);
  const pendingContacts = asArray(data?.contacts);
  const inventory = data?.inventory;
  const analytics = buildSalesAnalytics(data?.currentSummary, data?.rangeSummary);
  const maxMonthlyRevenue = Math.max(
    0,
    ...analytics.monthSeries.map((entry) => entry.revenue),
  );
  const downloading = downloadState.status === "loading";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reportStartDate = parseDateInput(reportFilters.fecha_desde);
  const reportEndDate = getReportEndDate(reportStartDate, reportFilters.periodo);
  const latestReportStart = getLatestReportStart(reportFilters.periodo, today);
  const reportIncludesFuture =
    !reportStartDate ||
    !reportEndDate ||
    reportStartDate > today ||
    reportEndDate > today;

  return (
    <section className={styles.dashboardPage}>
      <header className={styles.dashboardHeader}>
        <div>
          <span className={styles.eyebrow}>Empresa activa</span>
          <h1>{company.nombre}</h1>
          <p>Ventas confirmadas, pagos por metodo y actividad comercial.</p>
        </div>
        <div className={styles.companyMode}>
          <span>Operacion</span>
          <strong>{company.modo_inventario_nombre}</strong>
        </div>
      </header>

      <section className={styles.reportToolbar} aria-labelledby="report-title">
        <div className={styles.reportHeading}>
          <FileSpreadsheet size={22} />
          <span>
            <small>Reportes</small>
            <h2 id="report-title">Exportar informacion contable</h2>
          </span>
        </div>
        <form onSubmit={handleReportDownload}>
          <label>
            <span>Fecha inicial</span>
            <input
              aria-describedby="report-period-status"
              max={formatDateParam(latestReportStart)}
              name="fecha_desde"
              onChange={updateReportFilter}
              required
              type="date"
              value={reportFilters.fecha_desde}
            />
          </label>
          <label>
            <span>Periodo</span>
            <select
              name="periodo"
              onChange={updateReportFilter}
              value={reportFilters.periodo}
            >
              {REPORT_PERIODS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Contenido</span>
            <select name="tipo" onChange={updateReportFilter} value={reportFilters.tipo}>
              {REPORT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Formato</span>
            <select
              name="formato"
              onChange={updateReportFilter}
              value={reportFilters.formato}
            >
              {REPORT_FORMATS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            aria-disabled={downloading || reportIncludesFuture}
            className={styles.reportDownloadButton}
            data-loading={downloading}
            disabled={downloading || reportIncludesFuture}
            type="submit"
          >
            {downloading ? (
              <LoaderCircle className={styles.spin} size={17} />
            ) : (
              <Download size={17} />
            )}
            {downloading ? "Preparando" : "Descargar"}
          </button>
        </form>
        <p
          className={`${styles.reportPeriod} ${reportIncludesFuture ? styles.reportPeriodInvalid : ""}`}
          id="report-period-status"
          role="status"
        >
          {reportIncludesFuture
            ? `El periodo termina despues de hoy. La fecha inicial maxima para un reporte ${reportFilters.periodo} es ${reportDateFormatter.format(latestReportStart)}.`
            : `Periodo calculado: ${reportDateFormatter.format(reportStartDate)} al ${reportDateFormatter.format(reportEndDate)}.`}
        </p>
        {downloadState.message ? (
          <p
            className={`${styles.reportFeedback} ${styles[`reportFeedback_${downloadState.status}`]}`}
            role={downloadState.status === "error" ? "alert" : "status"}
          >
            {downloadState.message}
          </p>
        ) : null}
      </section>

      <div className={styles.metricStrip}>
        <article className={styles.metricItem}>
          <span className={styles.metricIcon}><CreditCard size={20} /></span>
          <span className={styles.metricCopy}>
            <small>Ingresos este mes</small>
            <strong>{money.format(analytics.revenue)}</strong>
            <em className={styles[`trend_${analytics.revenueChange.direction}`]}>
              {analytics.revenueChange.label}
            </em>
          </span>
        </article>
        <article className={styles.metricItem}>
          <span className={styles.metricIcon}><ClipboardList size={20} /></span>
          <span className={styles.metricCopy}>
            <small>Ventas confirmadas</small>
            <strong>{analytics.sales}</strong>
            <em className={styles[`trend_${analytics.salesChange.direction}`]}>
              {analytics.salesChange.label}
            </em>
          </span>
        </article>
        <article className={styles.metricItem}>
          <span className={styles.metricIcon}><PackageCheck size={20} /></span>
          <span className={styles.metricCopy}>
            <small>Ticket promedio</small>
            <strong>{money.format(analytics.averageTicket)}</strong>
            <em>Por venta confirmada</em>
          </span>
        </article>
        <article className={styles.metricItem}>
          <span className={`${styles.metricIcon} ${styles.metricIconBranch}`}>
            <Building2 size={20} />
          </span>
          <span className={styles.metricCopy}>
            <small>Pagos en sucursal</small>
            <strong>{money.format(analytics.paymentMethods.branch.amount)}</strong>
            <em>{formatApprovedPaymentCount(analytics.paymentMethods.branch.count)}</em>
          </span>
        </article>
        <article className={styles.metricItem}>
          <span className={`${styles.metricIcon} ${styles.metricIconOnline}`}>
            <WalletCards size={20} />
          </span>
          <span className={styles.metricCopy}>
            <small>Pagos en linea</small>
            <strong>{money.format(analytics.paymentMethods.online.amount)}</strong>
            <em>{formatApprovedPaymentCount(analytics.paymentMethods.online.count)}</em>
          </span>
        </article>
      </div>

      {data?.currentSummary === null || data?.rangeSummary === null ? (
        <div className={styles.analyticsWarning} role="alert">
          <AlertTriangle size={18} />
          No se pudieron cargar todos los indicadores de ventas del servidor.
        </div>
      ) : null}

      <div className={styles.analyticsGrid}>
        <section className={styles.analyticsPanel}>
          <header className={styles.analyticsHeader}>
            <div>
              <span>Ventas confirmadas</span>
              <h2>Ingresos de los ultimos 6 meses</h2>
            </div>
            <strong>{money.format(analytics.rangeRevenue)}</strong>
          </header>
          <div
            className={styles.salesChart}
            role="img"
            aria-label={`Ingresos confirmados de los ultimos seis meses: ${money.format(analytics.rangeRevenue)}`}
          >
            {analytics.monthSeries.map((entry) => {
              const barHeight =
                entry.revenue > 0 && maxMonthlyRevenue > 0
                  ? `${Math.max(7, (entry.revenue / maxMonthlyRevenue) * 100)}%`
                  : "3px";

              return (
                <div className={styles.chartColumn} key={entry.key}>
                  <span className={styles.chartValue}>
                    {compactMoney.format(entry.revenue)}
                  </span>
                  <div className={styles.chartTrack}>
                    <i
                      className={entry.key === monthKey(new Date()) ? styles.currentBar : ""}
                      style={{ height: barHeight }}
                      title={`${entry.label}: ${money.format(entry.revenue)}`}
                    />
                  </div>
                  <strong>{entry.label}</strong>
                </div>
              );
            })}
          </div>
          <div className={styles.accountingBreakdown}>
            <span><small>Subtotal</small><strong>{money.format(analytics.subtotal)}</strong></span>
            <span><small>Descuentos</small><strong>{money.format(analytics.discounts)}</strong></span>
            <span><small>Impuestos</small><strong>{money.format(analytics.taxes)}</strong></span>
            <span><small>Envios</small><strong>{money.format(analytics.shipping)}</strong></span>
          </div>
          <footer className={styles.analyticsFooter}>
            <span>{analytics.rangeSales} ventas confirmadas en el periodo</span>
            <span>Totales calculados por el servidor</span>
          </footer>
        </section>

        <section className={styles.analyticsPanel}>
          <header className={styles.analyticsHeader}>
            <div>
              <span>Mes actual</span>
              <h2>Estado de los pedidos</h2>
            </div>
            <strong>{analytics.totalCurrentOrders}</strong>
          </header>
          {analytics.totalCurrentOrders > 0 ? (
            <div className={styles.statusBreakdown}>
              {analytics.statusBreakdown.map((entry) => (
                <div key={entry.key}>
                  <span>
                    <strong>{entry.label}</strong>
                    <small>{entry.amount !== undefined ? `${entry.count} · ${formatDecimalMoney(entry.amount)}` : entry.count}</small>
                  </span>
                  <i>
                    <b
                      className={styles[`status_${entry.key}`]}
                      style={{
                        width: `${(entry.count / analytics.totalCurrentOrders) * 100}%`,
                      }}
                    />
                  </i>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.bandEmpty}>No hay pedidos registrados este mes.</p>
          )}
          {analytics.pendingMethods.totalCount > 0 ? (
            <footer className={styles.pendingPanelFooter}>
              <span>
                <strong>{analytics.pendingMethods.totalCount}</strong>
                {analytics.pendingMethods.totalCount === 1 ? " pedido por gestionar" : " pedidos por gestionar"}
              </span>
              <div className={styles.pendingPanelActions}>
                <button onClick={() => onNavigate("pedidos")} type="button">
                  Revisar pedidos <ArrowRight size={15} />
                </button>
                {analytics.pendingMethods.branch.count > 0 ? (
                  <button onClick={() => onNavigate("pagos", { estado: "pendiente" })} type="button">
                    Confirmar cobros <ArrowRight size={15} />
                  </button>
                ) : null}
              </div>
            </footer>
          ) : null}
        </section>
      </div>

      <div className={styles.dashboardQuickLinks}>
        <button onClick={() => onNavigate("productos")} type="button">
          <ShoppingBag size={18} />
          <span><small>Catalogo activo</small><strong>{countFrom(data?.products)}</strong></span>
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate("usuarios")} type="button">
          <Users size={18} />
          <span><small>Usuarios activos</small><strong>{countFrom(data?.users)}</strong></span>
          <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate("contactos")} type="button">
          <Mail size={18} />
          <span><small>Mensajes nuevos</small><strong>{countFrom(data?.contacts)}</strong></span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className={styles.dashboardGrid}>
        <section className={styles.dashboardBand}>
          <header>
            <div><span>Ventas</span><h2>Pedidos recientes</h2></div>
            <button onClick={() => onNavigate("pedidos")} type="button">
              Ver todos <ArrowRight size={15} />
            </button>
          </header>
          {recentOrders.length ? (
            <div className={styles.activityList}>
              {recentOrders.map((order) => (
                <button key={order.id} onClick={() => onNavigate("pedidos")} type="button">
                  <span><strong>{order.numero}</strong><small>{order.usuario_nombre || "Cliente"}</small></span>
                  <span><strong>{money.format(Number(order.total) || 0)}</strong><small>{getAdminPaymentMethod(order.metodo_pago).label}</small></span>
                </button>
              ))}
            </div>
          ) : <p className={styles.bandEmpty}>Aun no hay pedidos para mostrar.</p>}
        </section>

        <section className={styles.dashboardBand}>
          <header>
            <div><span>Rendimiento</span><h2>Productos mas vendidos</h2></div>
            <button onClick={() => onNavigate("productos")} type="button">
              Ver catalogo <ArrowRight size={15} />
            </button>
          </header>
          {analytics.topProducts.length ? (
            <div className={styles.activityList}>
              {analytics.topProducts.map((product) => (
                <button key={product.id} onClick={() => onNavigate("productos")} type="button">
                  <span><strong>{product.name}</strong><small>{product.units} unidades</small></span>
                  <span><strong>{money.format(product.revenue)}</strong><small>ingresos</small></span>
                </button>
              ))}
            </div>
          ) : <p className={styles.bandEmpty}>Aun no hay ventas confirmadas en el periodo.</p>}
        </section>

        <section className={styles.dashboardBand}>
          <header>
            <div><span>Atencion</span><h2>Mensajes por revisar</h2></div>
            <button onClick={() => onNavigate("contactos")} type="button">
              Abrir bandeja <ArrowRight size={15} />
            </button>
          </header>
          {pendingContacts.length ? (
            <div className={styles.activityList}>
              {pendingContacts.map((message) => (
                <button key={message.id} onClick={() => onNavigate("contactos")} type="button">
                  <span><strong>{message.nombre}</strong><small>{message.asunto || "Sin asunto"}</small></span>
                  <span className={styles.newMarker}>Nuevo</span>
                </button>
              ))}
            </div>
          ) : <p className={styles.bandEmpty}>No hay mensajes nuevos.</p>}
        </section>
      </div>

      {inventory ? (
        <section className={styles.inventoryCallout}>
          <Boxes size={25} />
          <div><span>Inventario fisico</span><strong>{inventory.existencia_total} unidades disponibles</strong><small>Valor estimado {money.format(Number(inventory.valor_inventario) || 0)}</small></div>
          <div className={inventory.productos_agotados > 0 ? styles.inventoryAlert : ""}><AlertTriangle size={18} /><span><strong>{inventory.productos_agotados}</strong> agotados</span></div>
          <div className={inventory.productos_bajo_stock > 0 ? styles.inventoryAlert : ""}><AlertTriangle size={18} /><span><strong>{inventory.productos_bajo_stock}</strong> bajo stock</span></div>
          <button onClick={() => onNavigate("inventario")} type="button">Administrar <ArrowRight size={16} /></button>
        </section>
      ) : null}
    </section>
  );
}
