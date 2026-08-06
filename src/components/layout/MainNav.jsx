import { useEffect, useRef } from "react";
import styles from "./MainNav.module.css";

function MainNav({ activeItemKey, items = [], onNavigate = () => {} }) {
  const navRef = useRef(null);
  const activeItemRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    const activeItem = activeItemRef.current;

    if (!nav || !activeItem || nav.scrollWidth <= nav.clientWidth) {
      return;
    }

    const nextScrollLeft =
      activeItem.offsetLeft - (nav.clientWidth - activeItem.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, nextScrollLeft), behavior: "smooth" });
  }, [activeItemKey, items.length]);

  return (
    <nav className={styles.nav} aria-label="Menu principal" ref={navRef}>
      {items.map((item) => (
        <a
          className={item.key === activeItemKey ? styles.active : ""}
          href={item.href}
          key={item.key}
          onClick={(event) => onNavigate(event, item)}
          aria-current={item.key === activeItemKey ? "page" : undefined}
          ref={item.key === activeItemKey ? activeItemRef : undefined}
          target={item.isExternal && item.abre_en_nueva_pestana ? "_blank" : undefined}
          rel={item.isExternal && item.abre_en_nueva_pestana ? "noreferrer" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default MainNav;
