import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  CreditCard,
  Image,
  KeyRound,
  LoaderCircle,
  Palette,
  ShieldCheck,
  Settings2,
  Share2,
} from "lucide-react";
import { getMyCompany, updateMyCompany } from "../services/adminService";
import { resolveMediaUrl } from "../services/apiClient";
import { normalizePhone, PHONE_LENGTH, PHONE_PATTERN } from "../utils/phone";
import styles from "./AdminApp.module.css";

const PAYMENT_PROVIDERS = [
  { label: "Simulado", value: "simulado" },
  { label: "PayPal", value: "paypal" },
  { label: "Stripe", value: "stripe" },
  { label: "BAC", value: "bac" },
  { label: "Otro", value: "otro" },
];

const PAYMENT_MODES = [
  { label: "Pruebas", value: "pruebas" },
  { label: "Produccion", value: "produccion" },
];

function getCompanyDraft(company) {
  return {
    ...(company || {}),
    pago_en_linea_credencial_secreta: "",
    pago_en_linea_modo: company?.pago_en_linea_modo || "pruebas",
    pago_en_linea_proveedor: company?.pago_en_linea_proveedor || "simulado",
    pago_en_linea_webhook_secreto: "",
  };
}

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
        setDraft(getCompanyDraft(payload));
      })
      .catch((requestError) => active && setError(errorMessage(requestError)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [empresaSlug]);

  function update(name, value) {
    setDraft((current) => ({
      ...current,
      [name]: name === "telefono" ? normalizePhone(value) : value,
    }));
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
      "productos_con_imagen", "pago_en_linea_activo",
      "pago_en_linea_proveedor", "pago_en_linea_modo",
      "pago_en_linea_credencial_publica",
    ].forEach((key) => {
      const value = key === "telefono" ? normalizePhone(draft[key]) : draft[key];
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (logoFile) formData.append("logo", logoFile);
    if (branchImageFile) formData.append("imagen_sucursales", branchImageFile);
    [
      "pago_en_linea_credencial_secreta",
      "pago_en_linea_webhook_secreto",
    ].forEach((key) => {
      const value = String(draft[key] || "").trim();
      if (value) formData.append(key, value);
    });

    try {
      const payload = await updateMyCompany(empresaSlug, formData);
      setCompany(payload);
      setDraft(getCompanyDraft(payload));
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
  const usesSimulatedPayment = draft.pago_en_linea_proveedor === "simulado";

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
            <label><span>Telefono</span><input autoComplete="tel" inputMode="numeric" maxLength={PHONE_LENGTH} onChange={(event) => update("telefono", event.target.value)} pattern={PHONE_PATTERN} type="text" value={normalizePhone(draft.telefono)} /></label>
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

        <section className={styles.settingsSection}>
          <header><CreditCard size={20} /><div><h2>Pago en linea</h2><p>Proveedor y credenciales utilizadas para iniciar cobros desde la tienda.</p></div></header>
          <div className={`${styles.ruleToggles} ${styles.paymentToggleGrid}`}>
            <label>
              <span><strong>Habilitar pago en linea</strong><small>La opcion publica solo aparecera cuando el servidor confirme que la configuracion esta completa.</small></span>
              <input checked={draft.pago_en_linea_activo === true} onChange={(event) => update("pago_en_linea_activo", event.target.checked)} type="checkbox" />
              <i />
            </label>
          </div>
          <div className={styles.settingsGrid}>
            <label>
              <span>Proveedor</span>
              <select onChange={(event) => update("pago_en_linea_proveedor", event.target.value)} value={draft.pago_en_linea_proveedor || "simulado"}>
                {PAYMENT_PROVIDERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Modo</span>
              <select onChange={(event) => update("pago_en_linea_modo", event.target.value)} value={draft.pago_en_linea_modo || "pruebas"}>
                {PAYMENT_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className={styles.settingsWide}>
              <span>Credencial publica</span>
              <input autoComplete="off" onChange={(event) => update("pago_en_linea_credencial_publica", event.target.value)} placeholder="Client ID o Merchant ID" value={draft.pago_en_linea_credencial_publica || ""} />
            </label>
            <label>
              <span>Credencial secreta</span>
              <input autoComplete="new-password" onChange={(event) => update("pago_en_linea_credencial_secreta", event.target.value)} placeholder={company.pago_en_linea_credencial_secreta_configurada ? "Configurada; escribe solo para reemplazar" : "Sin configurar"} type="password" value={draft.pago_en_linea_credencial_secreta || ""} />
              <small className={styles.credentialState}><KeyRound size={13} />{draft.pago_en_linea_credencial_secreta ? "Nueva credencial pendiente de guardar" : usesSimulatedPayment ? "No requerida para el proveedor simulado" : company.pago_en_linea_credencial_secreta_configurada ? "Credencial configurada" : "Credencial pendiente"}</small>
            </label>
            <label>
              <span>Secreto del webhook</span>
              <input autoComplete="new-password" onChange={(event) => update("pago_en_linea_webhook_secreto", event.target.value)} placeholder={company.pago_en_linea_webhook_secreto_configurado ? "Configurado; escribe solo para reemplazar" : "Sin configurar"} type="password" value={draft.pago_en_linea_webhook_secreto || ""} />
              <small className={styles.credentialState}><KeyRound size={13} />{draft.pago_en_linea_webhook_secreto ? "Nuevo secreto pendiente de guardar" : usesSimulatedPayment ? "No requerido para el proveedor simulado" : company.pago_en_linea_webhook_secreto_configurado ? "Webhook configurado" : "Webhook pendiente"}</small>
            </label>
          </div>
          <div className={styles.paymentAvailability} data-available={company.pago_en_linea_disponible === true}>
            <ShieldCheck size={18} />
            <span><strong>{company.pago_en_linea_disponible === true ? "Disponible en la tienda" : "No disponible en la tienda"}</strong><small>Estado confirmado por el servidor con la configuracion guardada.</small></span>
          </div>
        </section>

        <footer className={styles.settingsFooter}><button className={styles.primaryButton} disabled={saving} type="submit">{saving ? <LoaderCircle className={styles.spin} size={17} /> : <Check size={17} />} Guardar configuracion</button></footer>
      </form>
    </section>
  );
}
