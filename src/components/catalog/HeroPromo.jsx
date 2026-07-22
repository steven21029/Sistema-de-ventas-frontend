import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveMediaUrl } from "../../services/apiClient";
import styles from "./HeroPromo.module.css";

const AUTO_ADVANCE_MS = 6000;

function HeroPromo({ banners = [] }) {
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
  const hasMultipleSlides = slides.length > 1;

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (!hasMultipleSlides || isPaused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [hasMultipleSlides, isPaused, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const activeBanner = slides[activeIndex] || slides[0];

  function showPrevious() {
    setActiveIndex((currentIndex) => (currentIndex - 1 + slides.length) % slides.length);
  }

  function showNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
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
      <a className={styles.bannerLink} href={activeBanner.url} key={`${activeIndex}-${activeBanner.image}`}>
        <img src={activeBanner.image} alt={activeBanner.alt} />
      </a>

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
        <div className={styles.carouselDots} aria-label={`${slides.length} banners disponibles`}>
          {slides.map((banner, index) => (
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
