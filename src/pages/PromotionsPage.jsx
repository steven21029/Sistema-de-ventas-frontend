import HeroPromo from "../components/catalog/HeroPromo";
import styles from "./DynamicPages.module.css";

function PromotionsPage({ banners, title }) {
  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Promociones</p>
          <h1>{title}</h1>
        </div>
      </div>

      {banners.length > 0 ? (
        <HeroPromo banners={banners} />
      ) : (
        <div className={styles.statusBox}>No hay promociones activas por ahora.</div>
      )}
    </section>
  );
}

export default PromotionsPage;
