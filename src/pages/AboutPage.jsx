import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import SocialLinks from "../components/social/SocialLinks";
import { resolveMediaUrl } from "../services/apiClient";
import { getSobreNosotros } from "../services/empresaService";
import { getApiErrorMessage } from "../utils/apiError";
import styles from "./AboutPage.module.css";

function AboutPage({ empresa, empresaSlug, title }) {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError("");
    setContent(null);

    getSobreNosotros(empresaSlug)
      .then((payload) => {
        if (isActive) {
          setContent(payload);
        }
      })
      .catch((requestError) => {
        if (isActive) {
          setError(
            getApiErrorMessage(
              requestError,
              "No se pudo cargar la informacion de la empresa.",
            ),
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [empresaSlug]);

  if (isLoading) {
    return (
      <div className={styles.statusBox} role="status">
        <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
        <strong>Cargando {title.toLowerCase()}</strong>
      </div>
    );
  }

  if (!content) {
    return (
      <div className={styles.statusBox} role="alert">
        <strong>Esta seccion no esta disponible.</strong>
        <span>{error}</span>
      </div>
    );
  }

  const imageUrl = resolveMediaUrl(content.imagen_final);
  const hasPurpose = content.mision || content.vision;

  return (
    <article className={styles.page}>
      <header className={styles.intro}>
        <p>{empresa?.nombre || "Nuestra empresa"}</p>
        <h1>{content.titulo || title}</h1>
        {content.introduccion && <div>{content.introduccion}</div>}
      </header>

      {imageUrl && (
        <figure className={styles.imageBand}>
          <img
            alt={`Equipo e identidad de ${empresa?.nombre || "la empresa"}`}
            src={imageUrl}
          />
        </figure>
      )}

      {content.historia && (
        <section className={styles.story}>
          <p>Nuestra trayectoria</p>
          <h2>Una historia construida para servirte</h2>
          <div>{content.historia}</div>
        </section>
      )}

      {hasPurpose && (
        <div className={styles.purposeGrid}>
          {content.mision && (
            <section>
              <span>01</span>
              <p>Mision</p>
              <h2>Lo que hacemos hoy</h2>
              <div>{content.mision}</div>
            </section>
          )}
          {content.vision && (
            <section>
              <span>02</span>
              <p>Vision</p>
              <h2>Hacia donde avanzamos</h2>
              <div>{content.vision}</div>
            </section>
          )}
        </div>
      )}

      {content.valores_lista?.length > 0 && (
        <section className={styles.values}>
          <div>
            <p>Lo que nos guia</p>
            <h2>Nuestros valores</h2>
          </div>
          <ul>
            {content.valores_lista.map((value) => (
              <li key={value}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <span>{value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.compromiso && (
        <section className={styles.commitment}>
          <p>Nuestro compromiso contigo</p>
          <div>{content.compromiso}</div>
        </section>
      )}

      <SocialLinks
        label={`Conecta con ${empresa?.nombre || "nosotros"}`}
        links={empresa?.redes_sociales}
        variant="wide"
      />
    </article>
  );
}

export default AboutPage;
