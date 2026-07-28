import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveMediaUrl } from "../../services/apiClient";
import styles from "./HeroPromo.module.css";

const AUTO_ADVANCE_MS = 6000;

function isExternalUrl(value) {
  return /^https?:\/\//i.test(value || "");
}

function HeroPromo({ banners = [], onNavigate }) {
  const slides = useMemo(
    () =>
      banners
        .map((banner) => ({
          ...banner,
          image: resolveMediaUrl(banner?.imagen_final),
          url: banner?.url_boton || "#productos",
          alt: banner?.texto_alternativo || banner?.titulo || "Banner promocional",
        }))
        .filter((banner) => banner.image),
    [banners],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState({});
  const visibleSlides = useMemo(
    () => slides.filter((banner) => !failedImages[banner.image]),
    [failedImages, slides],
  );
  const hasMultipleSlides = visibleSlides.length > 1;

  useEffect(() => {
    setFailedImages({});
  }, [slides]);

  useEffect(() => {
    if (activeIndex >= visibleSlides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, visibleSlides.length]);

  useEffect(() => {
    if (!hasMultipleSlides || isPaused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % visibleSlides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [hasMultipleSlides, isPaused, visibleSlides.length]);

  if (visibleSlides.length === 0) {
    return null;
  }

  function showPrevious() {
    setActiveIndex(
      (currentIndex) => (currentIndex - 1 + visibleSlides.length) % visibleSlides.length,
    );
  }

  function showNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % visibleSlides.length);
  }

  function handleImageError(image) {
    setFailedImages((current) => ({ ...current, [image]: true }));
  }

  function handleSlideClick(event, url) {
    if (
      !url ||
      isExternalUrl(url) ||
      !url.startsWith("/") ||
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
    onNavigate?.(url);
  }

  return (
    <section
      className={styles.carousel}
      aria-label="Banners promocionales"
      onBlur={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.bannerViewport}>
        <div
          className={styles.bannerTrack}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {visibleSlides.map((banner, index) => (
            <a
              className={styles.bannerSlide}
              href={banner.url}
              key={`${banner.image}-${index}`}
              onClick={(event) => handleSlideClick(event, banner.url)}
              tabIndex={index === activeIndex ? 0 : -1}
              target={isExternalUrl(banner.url) ? "_blank" : undefined}
              rel={isExternalUrl(banner.url) ? "noreferrer" : undefined}
              aria-hidden={index === activeIndex ? undefined : "true"}
            >
              <img
                src={banner.image}
                alt={banner.alt}
                onError={() => handleImageError(banner.image)}
              />
            </a>
          ))}
        </div>
      </div>

      {hasMultipleSlides && (
        <>
          <button
            className={`${styles.navButton} ${styles.previousButton}`}
            type="button"
            onClick={showPrevious}
            aria-label="Banner anterior"
          >
            <ChevronLeft size={24} aria-hidden="true" />
          </button>
          <button
            className={`${styles.navButton} ${styles.nextButton}`}
            type="button"
            onClick={showNext}
            aria-label="Siguiente banner"
          >
            <ChevronRight size={24} aria-hidden="true" />
          </button>
        </>
      )}

      {hasMultipleSlides && (
        <div className={styles.carouselDots} aria-label={`${visibleSlides.length} banners disponibles`}>
          {visibleSlides.map((banner, index) => (
            <button
              className={index === activeIndex ? styles.activeDot : ""}
              type="button"
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`Mostrar banner ${index + 1}: ${banner.titulo || banner.alt}`}
              key={`${banner.image}-${index}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default HeroPromo;
