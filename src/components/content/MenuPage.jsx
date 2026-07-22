import styles from "./MenuPage.module.css";

function MenuPage({ empresa, item }) {
  const description = item?.descripcion || item?.subtitulo || item?.contenido || "";

  return (
    <section className={styles.page} aria-labelledby="menu-page-title">
      <p className={styles.eyebrow}>{empresa?.nombre || "Empresa"}</p>
      <h1 id="menu-page-title">{item?.label || "Pagina"}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </section>
  );
}

export default MenuPage;
