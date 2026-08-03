import { Mail, Phone, Send } from "lucide-react";
import { useState } from "react";
import SocialLinks from "../components/social/SocialLinks";
import { enviarMensajeContacto } from "../services/paginasService";
import styles from "./DynamicPages.module.css";

const EMPTY_FORM = {
  nombre: "",
  telefono: "",
  correo: "",
  asunto: "",
  mensaje: "",
};

function ContactPage({ empresa, empresaSlug, title }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback("");

    if (!form.nombre.trim() || !form.mensaje.trim()) {
      setFeedback("Escribe tu nombre y mensaje para continuar.");
      return;
    }

    if (!form.telefono.trim() && !form.correo.trim()) {
      setFeedback("Agrega un telefono o correo para poder responderte.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await enviarMensajeContacto({
        empresa_slug: empresaSlug,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
        asunto: form.asunto.trim(),
        mensaje: form.mensaje.trim(),
      });

      setFeedback(response?.mensaje || "Mensaje recibido correctamente.");
      setForm(EMPTY_FORM);
    } catch {
      setFeedback("No se pudo enviar el mensaje. Intentalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Atencion</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className={styles.contactLayout}>
        <aside className={styles.contactPanel}>
          <h2>{empresa?.nombre || "Contacto"}</h2>
          <SocialLinks
            label="Encuentranos en redes"
            links={empresa?.redes_sociales}
          />
          {empresa?.telefono && (
            <p>
              <Phone size={17} aria-hidden="true" /> {empresa.telefono}
            </p>
          )}
          {empresa?.correo && (
            <p>
              <Mail size={17} aria-hidden="true" /> {empresa.correo}
            </p>
          )}
          {empresa?.direccion && <p>{empresa.direccion}</p>}
          <span>Deja tus consultas o sugerencias y el equipo las revisara.</span>
        </aside>

        <form className={styles.contactForm} onSubmit={handleSubmit}>
          <label className={styles.field}>
            Nombre
            <input
              type="text"
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            Telefono
            <input
              type="tel"
              value={form.telefono}
              onChange={(event) => updateField("telefono", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            Correo
            <input
              type="email"
              value={form.correo}
              onChange={(event) => updateField("correo", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            Asunto
            <input
              type="text"
              value={form.asunto}
              onChange={(event) => updateField("asunto", event.target.value)}
            />
          </label>
          <label className={styles.field}>
            Mensaje
            <textarea
              value={form.mensaje}
              onChange={(event) => updateField("mensaje", event.target.value)}
              required
            />
          </label>

          {feedback && <div className={styles.formMessage}>{feedback}</div>}

          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            <Send size={18} aria-hidden="true" />
            {isSubmitting ? "Enviando" : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default ContactPage;
