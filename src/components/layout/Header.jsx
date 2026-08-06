import { useEffect, useState } from "react";
import { ChevronDown, Heart, Search, ShoppingCart, UserRound } from "lucide-react";
import { resolveMediaUrl } from "../../services/apiClient";
import styles from "./Header.module.css";

function Header({
  accountLabel = "Mi cuenta",
  cartAttentionKey = 0,
  cartCount,
  empresa,
  favoriteCount = 0,
  onAccountClick,
  onBrandClick,
  onCartClick,
  onFavoritesClick,
  onSearchChange,
  onSearchSubmit,
  searchEnabled = true,
  searchPlaceholder = "Buscar productos o servicios",
  searchValue,
  shoppingActionsHidden = false,
}) {
  const logoUrl = resolveMediaUrl(empresa?.logo);
  const [logoShape, setLogoShape] = useState("wide");
  const [hasLogoError, setHasLogoError] = useState(false);
  const [cartAttentionActive, setCartAttentionActive] = useState(false);
  const brandName = empresa?.nombre || "Tu logo aqui";
  const brandParts = brandName.trim().split(/\s+/);
  const primaryName = empresa?.nombre ? brandParts[0] : "Tu logo";
  const secondaryName = empresa?.nombre
    ? brandParts.slice(1).join(" ") || empresa?.slug || "Tienda en linea"
    : "aqui";

  useEffect(() => {
    setHasLogoError(false);

    if (!logoUrl) {
      return undefined;
    }

    let isActive = true;
    const image = new Image();

    image.onload = () => {
      if (!isActive) {
        return;
      }

      const ratio = image.naturalWidth / image.naturalHeight;
      setLogoShape(ratio > 0.8 && ratio < 1.25 ? "squareCanvas" : "wide");
    };

    image.onerror = () => {
      if (isActive) {
        setHasLogoError(true);
        setLogoShape("wide");
      }
    };

    image.src = logoUrl;

    return () => {
      isActive = false;
    };
  }, [logoUrl]);

  useEffect(() => {
    if (!cartAttentionKey) {
      return undefined;
    }

    setCartAttentionActive(false);
    const animationFrame = window.requestAnimationFrame(() => {
      setCartAttentionActive(true);
    });
    const attentionTimer = window.setTimeout(() => {
      setCartAttentionActive(false);
    }, 620);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(attentionTimer);
    };
  }, [cartAttentionKey]);

  function handleBrandClick(event) {
    event.preventDefault();

    if (onBrandClick) {
      onBrandClick();
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header
      className={`${styles.header} ${!searchEnabled ? styles.headerWithoutSearch : ""}`}
      aria-label="Encabezado principal"
    >
      <a className={styles.brand} href="/" aria-label={brandName} onClick={handleBrandClick}>
        {logoUrl && !hasLogoError ? (
          <img
            className={`${styles.logo} ${
              logoShape === "squareCanvas" ? styles.squareCanvasLogo : ""
            }`}
            src={logoUrl}
            alt={brandName}
          />
        ) : (
          <span className={styles.textBrand}>
            <strong>{primaryName}</strong>
            <small>{secondaryName}</small>
          </span>
        )}
      </a>

      {searchEnabled && (
        <form className={styles.searchBox} onSubmit={onSearchSubmit}>
          <Search size={22} aria-hidden="true" />
          <label className="srOnly" htmlFor="catalog-search">
            {searchPlaceholder}
          </label>
          <input
            id="catalog-search"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </form>
      )}

      <nav className={styles.quickActions} aria-label="Accesos rapidos">
        {!shoppingActionsHidden && (
          <>
            <button
              className={`${styles.iconTextButton} ${styles.favoriteAction}`}
              type="button"
              onClick={onFavoritesClick}
              aria-label={`Abrir favoritos. ${favoriteCount} guardados`}
            >
              <Heart
                size={24}
                fill={favoriteCount > 0 ? "currentColor" : "none"}
                aria-hidden="true"
              />
              <span>Favoritos</span>
              {favoriteCount > 0 && (
                <span className={styles.favoriteBadge} aria-hidden="true">
                  {favoriteCount}
                </span>
              )}
            </button>
            <button
              className={`${styles.cartButton} ${
                cartAttentionActive ? styles.cartButtonAttention : ""
              }`}
              type="button"
              onClick={onCartClick}
              aria-label={`Abrir carrito. ${cartCount} articulos`}
            >
              <ShoppingCart size={25} aria-hidden="true" />
              <span className={styles.cartBadge}>{cartCount}</span>
            </button>
          </>
        )}
        <button
          className={styles.iconTextButton}
          type="button"
          onClick={onAccountClick}
          aria-label={accountLabel}
        >
          <UserRound size={24} aria-hidden="true" />
          <span>{accountLabel}</span>
          <ChevronDown size={17} aria-hidden="true" />
        </button>
      </nav>
    </header>
  );
}

export default Header;
