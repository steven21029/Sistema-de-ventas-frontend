import {
  BookOpen,
  Check,
  Image as ImageIcon,
  LoaderCircle,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../services/apiClient";
import { getMyAbout, updateMyAbout } from "../services/adminService";
import styles from "./AdminApp.module.css";

function errorMessage(error) {
  const payload = error?.payload;

  if (payload?.detail) {
    return payload.detail;
  }

  if (payload && typeof payload === "object") {
    const entry = Object.entries(payload)[0];
    if (entry) {
      const detail = Array.isArray(entry[1]) ? entry[1].join(" ") : entry[1];
      return `${entry[0]}: ${detail}`;
    }
  }

  return error?.message || "No se pudo guardar el contenido.";
}

export default function AboutSettingsPage({ empresaSlug }) {
  const [content, setContent] = useState(null);
  const [draft, setDraft] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSaved(false);
    setImageFile(null);

    getMyAbout(empresaSlug)
      .then((payload) => {
        if (!active) {
          return;
        }
        setContent(payload);
        setDraft(payload);
      })
      .catch((requestError) => {
        if (active) {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [empresaSlug]);

  function update(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
    setSaved(false);
  }

  function selectImage(file) {
    setImageFile(file);
    if (file) {
      update("imagen_url", "");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const formData = new FormData();
    [
      "titulo",
      "introduccion",
      "historia",
      "mision",
      "vision",
      "valores",
      "compromiso",
      "imagen_url",
    ].forEach((key) => {
      formData.append(key, draft[key] || "");
    });

    if (imageFile) {
      formData.append("imagen", imageFile);
    }

    try {
      const payload = await updateMyAbout(empresaSlug, formData);
      setContent(payload);
      setDraft(payload);
      setImageFile(null);
      setSaved(true);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.fullPageLoading}>
        <LoaderCircle className={styles.spin} size={24} />
        <strong>Cargando Sobre nosotros</strong>
      </div>
    );
  }

  if (!content) {
    return <div className={styles.inlineError}>{error || "No se encontro el contenido."}</div>;
  }

  const imageUrl = resolveMediaUrl(content.imagen_final);

  return (
    <section className={styles.settingsPage}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>Contenido publico</span>
          <h1>Sobre nosotros</h1>
          <p>Cuenta la historia, proposito y valores de la empresa en la tienda.</p>
        </div>
      </header>

      {error ? <div className={styles.inlineError}>{error}</div> : null}
      {saved ? (
        <div className={styles.successBanner}>
          <Check size={18} /> Contenido guardado correctamente.
        </div>
      ) : null}

      <form onSubmit={submit}>
        <section className={styles.settingsSection}>
          <header>
            <BookOpen size={20} />
            <div>
              <h2>Presentacion e historia</h2>
              <p>El titulo y la introduccion reciben al visitante.</p>
            </div>
          </header>
          <div className={styles.settingsGrid}>
            <label className={styles.settingsWide}>
              <span>Titulo</span>
              <input
                maxLength="180"
                onChange={(event) => update("titulo", event.target.value)}
                required
                value={draft.titulo || ""}
              />
            </label>
            <label className={styles.settingsWide}>
              <span>Introduccion</span>
              <textarea
                onChange={(event) => update("introduccion", event.target.value)}
                rows="4"
                value={draft.introduccion || ""}
              />
            </label>
            <label className={styles.settingsWide}>
              <span>Historia</span>
              <textarea
                onChange={(event) => update("historia", event.target.value)}
                rows="7"
                value={draft.historia || ""}
              />
            </label>
          </div>
        </section>

        <section className={styles.settingsSection}>
          <header>
            <Target size={20} />
            <div>
              <h2>Proposito de la empresa</h2>
              <p>Las secciones vacias no se mostraran en la tienda.</p>
            </div>
          </header>
          <div className={styles.settingsGrid}>
            <label>
              <span>Mision</span>
              <textarea
                onChange={(event) => update("mision", event.target.value)}
                rows="6"
                value={draft.mision || ""}
              />
            </label>
            <label>
              <span>Vision</span>
              <textarea
                onChange={(event) => update("vision", event.target.value)}
                rows="6"
                value={draft.vision || ""}
              />
            </label>
            <label className={styles.settingsWide}>
              <span>Valores (uno por linea)</span>
              <textarea
                onChange={(event) => update("valores", event.target.value)}
                placeholder={"Calidad\nIntegridad\nServicio"}
                rows="6"
                value={draft.valores || ""}
              />
            </label>
            <label className={styles.settingsWide}>
              <span>Compromiso</span>
              <textarea
                onChange={(event) => update("compromiso", event.target.value)}
                rows="5"
                value={draft.compromiso || ""}
              />
            </label>
          </div>
        </section>

        <section className={styles.settingsSection}>
          <header>
            <ImageIcon size={20} />
            <div>
              <h2>Imagen institucional</h2>
              <p>La URL externa tiene prioridad; al elegir un archivo se limpiara esa URL.</p>
            </div>
          </header>
          <div className={styles.mediaSettings}>
            <div className={`${styles.logoPreview} ${styles.aboutImagePreview}`}>
              {imageUrl ? (
                <img alt="Vista actual de Sobre nosotros" src={imageUrl} />
              ) : (
                <ImageIcon size={35} />
              )}
            </div>
            <label>
              <span>Nueva imagen</span>
              <input
                accept="image/*"
                onChange={(event) => selectImage(event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <label>
              <span>URL externa de imagen</span>
              <input
                onChange={(event) => {
                  setImageFile(null);
                  update("imagen_url", event.target.value);
                }}
                type="url"
                value={draft.imagen_url || ""}
              />
            </label>
          </div>
        </section>

        <footer className={styles.settingsFooter}>
          <button className={styles.primaryButton} disabled={saving} type="submit">
            {saving ? (
              <LoaderCircle className={styles.spin} size={17} />
            ) : (
              <Check size={17} />
            )}
            Guardar contenido
          </button>
        </footer>
      </form>
    </section>
  );
}
