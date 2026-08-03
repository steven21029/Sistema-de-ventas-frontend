import { useEffect, useState } from "react";
import { Boxes, Check, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { adjustInventory, getInventorySummary, listAdminResource } from "../services/adminService";
import { asArray } from "../services/apiClient";
import styles from "./AdminApp.module.css";

const money = new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" });

function messageFrom(error) {
  const payload = error?.payload;
  if (payload?.detail) return payload.detail;
  if (payload && typeof payload === "object") {
    const entry = Object.entries(payload)[0];
    if (entry) return `${entry[0]}: ${Array.isArray(entry[1]) ? entry[1].join(" ") : entry[1]}`;
  }
  return error?.message || "No se pudo completar el ajuste.";
}

export default function InventoryPage({ company, empresaSlug }) {
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);
  const [stock, setStock] = useState(0);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!company.permite_productos_fisicos) return;
    setLoading(true);
    setError("");
    try {
      const [summaryPayload, productPayload] = await Promise.all([
        getInventorySummary(empresaSlug),
        listAdminResource("/inventario/productos/", empresaSlug, { buscar: search, orden: "nombre" }),
      ]);
      setSummary(summaryPayload);
      setProducts(asArray(productPayload));
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [empresaSlug, search]);

  function openAdjust(product) {
    setTarget(product);
    setStock(Number(product.existencia) || 0);
    setReason("");
    setReference("");
  }

  async function saveAdjustment(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await adjustInventory(empresaSlug, {
        codigo_barra: target.codigo_barra,
        existencia_nueva: Number(stock),
        motivo: reason,
        referencia: reference,
      });
      setTarget(null);
      await load();
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (!company.permite_productos_fisicos) {
    return <section className={styles.noInventory}><Boxes size={34} /><span className={styles.eyebrow}>Inventario</span><h1>No aplica para esta empresa</h1><p>{company.nombre} trabaja con servicios y no controla existencias fisicas.</p></section>;
  }

  return (
    <section className={styles.resourcePage}>
      <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Operacion</span><h1>Inventario</h1><p>Existencias fisicas y alertas de reposicion.</p></div></header>
      {summary ? <div className={styles.inventoryMetrics}>{[
        ["Productos", summary.total_productos], ["Existencia total", summary.existencia_total],
        ["Bajo stock", summary.productos_bajo_stock], ["Agotados", summary.productos_agotados],
        ["Valor", money.format(Number(summary.valor_inventario) || 0)],
      ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : null}
      <div className={styles.tableToolbar}>
        <form className={styles.tableSearch} onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); }}><Search size={17} /><input onChange={(event) => setSearchDraft(event.target.value)} placeholder="Buscar producto o codigo" value={searchDraft} /></form>
        <span className={styles.resultCount}>{products.length} productos</span>
      </div>
      {error ? <div className={styles.inlineError}>{error}</div> : null}
      <div className={styles.tableFrame}>
        {loading ? <div className={styles.loadingState}><LoaderCircle className={styles.spin} size={23} /> Cargando inventario</div> : (
          <div className={styles.tableScroll}><table className={styles.dataTable}><thead><tr><th>Producto</th><th>Categoria</th><th>Existencia</th><th>Minimo</th><th>Estado</th><th /></tr></thead><tbody>{products.map((product) => <tr key={product.codigo_interno}><td data-label="Producto"><span className={styles.primaryCell}><strong>{product.nombre}</strong><small>{product.codigo_barra}</small></span></td><td data-label="Categoria">{product.categoria_nombre}</td><td data-label="Existencia"><strong>{product.existencia}</strong></td><td data-label="Minimo">{product.existencia_minima}</td><td data-label="Estado"><span className={`${styles.status} ${product.agotado || product.inventario_bajo ? styles.statusAlert : styles.status_true}`}><span />{product.agotado ? "Agotado" : product.inventario_bajo ? "Bajo stock" : "Disponible"}</span></td><td className={styles.rowActions}><button aria-label="Ajustar existencia" onClick={() => openAdjust(product)} title="Ajustar existencia" type="button"><SlidersHorizontal size={17} /></button></td></tr>)}</tbody></table></div>
        )}
      </div>
      {target ? <div className={styles.modalLayer}><form className={styles.adjustDialog} onSubmit={saveAdjustment}><header><div><span>Ajuste de inventario</span><h2>{target.nombre}</h2></div><button aria-label="Cerrar" onClick={() => setTarget(null)} type="button"><X size={19} /></button></header><label><span>Nueva existencia</span><input min="0" onChange={(event) => setStock(event.target.value)} required type="number" value={stock} /></label><label><span>Motivo</span><textarea onChange={(event) => setReason(event.target.value)} placeholder="Conteo fisico, correccion..." rows="3" value={reason} /></label><label><span>Referencia</span><input onChange={(event) => setReference(event.target.value)} placeholder="Documento o nota interna" value={reference} /></label><footer><button className={styles.secondaryButton} onClick={() => setTarget(null)} type="button">Cancelar</button><button className={styles.primaryButton} disabled={saving} type="submit">{saving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />} Guardar ajuste</button></footer></form></div> : null}
    </section>
  );
}

