import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  Image,
  LoaderCircle,
  Palette,
  Settings2,
  Share2,
} from "lucide-react";
import { getMyCompany, updateMyCompany } from "../services/adminService";
import { resolveMediaUrl } from "../services/apiClient";
import styles from "./AdminApp.module.css";

function errorMessage(error) {
  const payload = error?.payload;
  if (payload?.detail) return payload.detail;
  if (payload && typeof payload === "object") {
    const entry = Object.entries(payload)[0];
    if (entry) return `${entry[0]}: ${Array.isArray(entry[1]) ? entry[1].join(" ") : entry[1]}`;
  }
  return error?.message || "No se pudo guardar la configuracion.";
}

export default function CompanySettingsPage({ empresaSlug, onCompanyUpdated }) {
  const [company, setCompany] = useState(null);
  const [draft, setDraft] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [branchImageFile, setBranchImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMyCompany(empresaSlug)
      .then((payload) => {
        if (!active) return;
        setCompany(payload);
        setDraft(payload);
      })
      .catch((requestError) => active && setError(errorMessage(requestError)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [empresaSlug]);

  function update(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    setSaved(false);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const formData = new FormData();
    [
      "nombre", "imagen_sucursales_url", "color_principal", "color_secundario",
      "color_acento", "color_texto", "color_fondo", "telefono", "correo",
      "direccion", "sitio_web", "instagram_url", "whatsapp_url",
      "facebook_url", "tiktok_url", "tiene_envios", "cobra_impuesto",
      "productos_con_imagen",
    ].forEach((key) => {
      const value = draft[key];
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (logoFile) formData.append("logo", logoFile);
    if (branchImageFile) formData.append("imagen_sucursales", branchImageFile);

    try {
      const payload = await updateMyCompany(empresaSlug, formData);
      setCompany(payload);
      setDraft(payload);
      setLogoFile(null);
      setBranchImageFile(null);
      setSaved(true);
      onCompanyUpdated?.(payload);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.fullPageLoading}><LoaderCircle className={styles.spin} size={24} /><strong>Cargando configuracion</strong></div>;
  if (!company) return <div className={styles.inlineError}>{error || "No se encontro la empresa."}</div>;

  return (
    <section className={styles.settingsPage}>
      <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Configuracion</span><h1>Identidad y operacion</h1><p>Estos cambios se reflejan en la tienda publica de {company.nombre}.</p></div></header>
      {error ? <div className={styles.inlineError}>{error}</div> : null}
      {saved ? <div className={styles.successBanner}><Check size={18} /> Configuracion guardada correctamente.</div> : null}
      <form onSubmit={submit}>
        <section className={styles.settingsSection}>
          <header><Building2 size={20} /><div><h2>Datos de la empresa</h2><p>Informacion visible para clientes y documentos.</p></div></header>
          <div className={styles.settingsGrid}>
            <label><span>Nombre</span><input onChange={(event) => update("nombre", event.target.value)} required value={draft.nombre || ""} /></label>
            <label><span>Telefono</span><input onChange={(event) => update("telefono", event.target.value)} value={draft.telefono || ""} /></label>
            <label><span>Correo</span><input onChange={(event) => update("correo", event.target.value)} type="email" value={draft.correo || ""} /></label>
            <label><span>Sitio web</span><input onChange={(event) => update("sitio_web", event.target.value)} type="url" value={draft.sitio_web || ""} /></label>
            <label className={styles.settingsWide}><span>Direccion</span><textarea onChange={(event) => update("direccion", event.target.value)} rows="3" value={draft.direccion || ""} /></label>
          </div>
        </section>

        <section className={styles.settingsSection}>
          <header><Share2 size={20} /><div><h2>Redes sociales</h2><p>Solo se mostraran en la tienda los enlaces que tengan contenido.</p></div></header>
          <div className={styles.settingsGrid}>
            <label><span>Instagram</span><input onChange={(event) => update("instagram_url", event.target.value)} placeholder="https://www.instagram.com/empresa" type="url" value={draft.instagram_url || ""} /></label>
            <label><span>WhatsApp</span><input onChange={(event) => update("whatsapp_url", event.target.value)} placeholder="https://wa.me/50499999999" type="url" value={draft.whatsapp_url || ""} /></label>
            <label><span>Facebook</span><input onChange={(event) => update("facebook_url", event.target.value)} placeholder="https://www.facebook.com/empresa" type="url" value={draft.facebook_url || ""} /></label>
            <label><span>TikTok</span><input onChange={(event) => update("tiktok_url", event.target.value)} placeholder="https://www.tiktok.com/@empresa" type="url" value={draft.tiktok_url || ""} /></label>
          </div>
        </section>

        <section className={styles.settingsSection}>
          <header><Image size={20} /><div><h2>Imagenes institucionales</h2><p>Usa archivos claros y con espacio suficiente alrededor del logo.</p></div></header>
          <div className={styles.mediaSettings}>
            <div className={styles.logoPreview}>{company.logo ? <img alt={`Logo de ${company.nombre}`} src={resolveMediaUrl(company.logo)} /> : <Building2 size={35} />}</div>
            <label><span>Nuevo logo</span><input accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} type="file" /></label>
            <label><span>Imagen general de sucursales</span><input accept="image/*" onChange={(event) => setBranchImageFile(event.target.files?.[0] || null)} type="file" /></label>
            <label><span>URL externa para sucursales</span><input onChange={(event) => update("imagen_sucursales_url", event.target.value)} type="url" value={draft.imagen_sucursales_url || ""} /></label>
          </div>
        </section>

        <section className={styles.settingsSection}>
          <header><Palette size={20} /><div><h2>Paleta de la tienda</h2><p>Los colores se aplican al encabezado, acciones y texto publico.</p></div></header>
          <div className={styles.colorGrid}>
            {[
              ["color_principal", "Principal"], ["color_secundario", "Secundario"],
              ["color_acento", "Acento"], ["color_texto", "Texto"], ["color_fondo", "Fondo"],
            ].map(([key, label]) => <label key={key}><span>{label}</span><div><input onChange={(event) => update(key, event.target.value)} type="color" value={draft[key] || "#ffffff"} /><code>{draft[key] || "#ffffff"}</code></div></label>)}
          </div>
        </section>

        <section className={styles.settingsSection}>
          <header><Settings2 size={20} /><div><h2>Reglas comerciales</h2><p>Configuraciones que cambian el comportamiento de la tienda.</p></div></header>
          <div className={styles.ruleToggles}>
            {[
              ["tiene_envios", "Ofrecer entregas", "Habilita las opciones local y nacional."],
              ["cobra_impuesto", "Cobrar impuesto", "El servidor aplicara la tasa configurada."],
              ["productos_con_imagen", "Imagenes por producto", "Reserva imagen individual en el catalogo."],
            ].map(([key, label, help]) => <label key={key}><span><strong>{label}</strong><small>{help}</small></span><input checked={draft[key] === true} onChange={(event) => update(key, event.target.checked)} type="checkbox" /><i /></label>)}
          </div>
        </section>

        <footer className={styles.settingsFooter}><button className={styles.primaryButton} disabled={saving} type="submit">{saving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />} Guardar configuracion</button></footer>
      </form>
    </section>
  );
}
