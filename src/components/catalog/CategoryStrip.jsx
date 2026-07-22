import {
  CircleDot,
  FlaskConical,
  Microscope,
  ShieldPlus,
  TestTube,
} from "lucide-react";
import styles from "./CategoryStrip.module.css";

const icons = [CircleDot, FlaskConical, TestTube, Microscope, ShieldPlus];

function CategoryStrip({
  categorias,
  familias,
  onClear,
  onSelectCategory,
  onSelectFamily,
  selectedCategory,
  selectedFamily,
}) {
  const primaryItems = familias.length > 0 ? familias : categorias;
  const mode = familias.length > 0 ? "familia" : "categoria";

  return (
    <section className={styles.section} aria-label="Categorias">
      <div className={styles.sectionHead}>
        <div>
          <p>Explorar</p>
          <h2>Categorias</h2>
        </div>
        <button type="button" onClick={onClear}>
          Ver todo
        </button>
      </div>

      {primaryItems.length > 0 ? (
        <div className={styles.grid}>
          {primaryItems.slice(0, 6).map((item, index) => {
            const Icon = icons[index % icons.length];
            const isSelected =
              mode === "familia"
                ? selectedFamily === item.nombre
                : selectedCategory === item.nombre;

            return (
              <button
                className={`${styles.categoryCard} ${isSelected ? styles.selected : ""}`}
                type="button"
                key={`${mode}-${item.nombre}`}
                onClick={() =>
                  mode === "familia"
                    ? onSelectFamily(item.nombre)
                    : onSelectCategory(item.nombre)
                }
              >
                <span className={styles.iconWrap}>
                  <Icon size={34} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span>
                  <strong>{item.nombre}</strong>
                  <small>{item.descripcion || "Catalogo disponible"}</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyText}>No hay familias o categorias activas.</p>
      )}
    </section>
  );
}

export default CategoryStrip;
