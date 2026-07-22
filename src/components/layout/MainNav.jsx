import styles from "./MainNav.module.css";

function MainNav({ activeItemKey, items = [], onNavigate = () => {} }) {
  return (
    <nav className={styles.nav} aria-label="Menu principal">
      {items.map((item) => (
        <a
          className={item.key === activeItemKey ? styles.active : ""}
          href={item.href}
          key={item.key}
          onClick={(event) => onNavigate(event, item)}
          aria-current={item.key === activeItemKey ? "page" : undefined}
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
