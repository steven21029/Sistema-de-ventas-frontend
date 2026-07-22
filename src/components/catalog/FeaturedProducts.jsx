import ProductCard from "./ProductCard";
import styles from "./FeaturedProducts.module.css";

function FeaturedProducts({
  categorias,
  isLoading,
  onAddToCart,
  onCategoryChange,
  onClearFilters,
  onSortChange,
  productos,
  selectedCategory,
  sortOrder,
}) {
  const productCountLabel = productos.length === 1 ? "1 producto" : `${productos.length} productos`;

  return (
    <section className={styles.section} id="productos" aria-label="Productos destacados">
      <div className={styles.sectionHead}>
        <div>
          <p>Catalogo</p>
          <h2>Examenes destacados</h2>
          <span>{isLoading ? "Actualizando catalogo" : productCountLabel}</span>
        </div>

        <div className={styles.controls}>
          <label>
            <span>Categoria</span>
            <select
              value={selectedCategory}
              onChange={(event) => onCategoryChange(event.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria.nombre || categoria.id} value={categoria.nombre}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Orden</span>
            <select value={sortOrder} onChange={(event) => onSortChange(event.target.value)}>
              <option value="">Recientes</option>
              <option value="nombre">Nombre</option>
              <option value="precio_asc">Precio menor</option>
              <option value="precio_desc">Precio mayor</option>
            </select>
          </label>

          <button type="button" onClick={onClearFilters}>
            Limpiar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.statusGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      ) : productos.length > 0 ? (
        <div className={styles.grid}>
          {productos.map((product) => (
            <ProductCard
              key={product.codigo_barra || product.nombre}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statusBox}>
          No se encontraron productos con los filtros actuales.
        </div>
      )}
    </section>
  );
}

export default FeaturedProducts;
