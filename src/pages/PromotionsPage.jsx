import { ExternalLink, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "../services/apiClient";
import { getOfertasPromocionales } from "../services/promocionesService";
import { formatMoney, toNumber } from "../utils/money";
import { normalizeSearchText, textIncludesSearch } from "../utils/search";
import styles from "./DynamicPages.module.css";

function isExternalUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

function OfferCard({ offer, onNavigate }) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl = resolveMediaUrl(offer.imagen_final);
  const normalPrice = toNumber(offer.precio_normal);
  const offerPrice = toNumber(offer.precio_oferta);
  const hasPrice = offerPrice > 0;
  const hasDiscount = normalPrice > offerPrice && hasPrice;
  const destination = offer.url_destino || "";
  const external = isExternalUrl(destination);
  const products = Array.isArray(offer.productos) ? offer.productos : [];

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  function handleClick(event) {
    if (!destination) {
      event.preventDefault();
      return;
    }

    if (
      external ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate(destination);
  }

  return (
    <article className={styles.offerCard}>
      <a
        className={styles.offerMedia}
        href={destination || "#"}
        onClick={handleClick}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        aria-label={offer.titulo}
      >
        {imageUrl && !hasImageError ? (
          <img
            src={imageUrl}
            alt={offer.titulo}
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true" />
        )}
      </a>

      <div className={styles.offerBody}>
        <div className={styles.offerMeta}>
          <span>
            <Tag size={15} aria-hidden="true" />
            {offer.tipo || "oferta"}
          </span>
          {Number(offer.porcentaje_descuento) > 0 && (
            <strong>{offer.porcentaje_descuento}% menos</strong>
          )}
        </div>

        <h3>{offer.titulo}</h3>
        {offer.descripcion && <p>{offer.descripcion}</p>}

        {products.length > 0 && (
          <ul className={styles.offerProducts}>
            {products.slice(0, 4).map((product) => (
              <li key={product.codigo || product.nombre}>
                {product.nombre}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.offerFooter}>
          <div>
            {hasDiscount && <small>{formatMoney(normalPrice)}</small>}
            <strong>{hasPrice ? formatMoney(offerPrice) : "Ver promocion"}</strong>
          </div>

          {destination && (
            <a
              className={styles.offerLink}
              href={destination}
              onClick={handleClick}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
            >
              Ver detalle
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function getOfferSearchText(offer) {
  const products = Array.isArray(offer?.productos) ? offer.productos : [];
  const packageName =
    typeof offer?.paquete === "string"
      ? offer.paquete
      : offer?.paquete?.nombre || offer?.paquete?.titulo;

  return [
    offer?.codigo,
    offer?.titulo,
    offer?.descripcion,
    offer?.tipo,
    packageName,
    ...products.map((product) => product?.nombre),
  ]
    .filter(Boolean)
    .join(" ");
}

function PromotionsPage({ empresaSlug, onNavigate, searchQuery = "", title }) {
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    if (!empresaSlug) {
      return undefined;
    }

    async function loadOffers() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await getOfertasPromocionales(empresaSlug);

        if (isActive) {
          setOffers(payload);
        }
      } catch {
        if (isActive) {
          setOffers([]);
          setError("No se pudieron cargar las promociones.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadOffers();

    return () => {
      isActive = false;
    };
  }, [empresaSlug]);

  const normalizedSearch = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const visibleOffers = useMemo(
    () =>
      offers.filter((offer) =>
        textIncludesSearch(getOfferSearchText(offer), normalizedSearch),
      ),
    [normalizedSearch, offers],
  );

  return (
    <section className={styles.page} aria-label={title}>
      <div className={styles.pageHead}>
        <div>
          <p>Ofertas</p>
          <h1>{title}</h1>
          <span className={styles.count}>
            {isLoading
              ? "Actualizando promociones"
              : `${visibleOffers.length} promociones`}
          </span>
        </div>
      </div>

      {error && <div className={styles.statusBox}>{error}</div>}

      {isLoading ? (
        <div className={styles.statusBox}>Cargando promociones...</div>
      ) : visibleOffers.length > 0 ? (
        <div className={styles.grid}>
          {visibleOffers.map((offer) => (
            <OfferCard
              offer={offer}
              key={offer.codigo || offer.titulo}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <div className={styles.statusBox}>
          {searchQuery
            ? `No encontramos promociones con "${searchQuery}".`
            : "No hay promociones activas por ahora."}
        </div>
      )}
    </section>
  );
}

export default PromotionsPage;
