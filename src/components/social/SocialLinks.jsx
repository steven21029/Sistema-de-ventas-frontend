import {
  Facebook,
  Instagram,
  MessageCircleMore,
  Music2,
} from "lucide-react";
import styles from "./SocialLinks.module.css";

const SOCIAL_NETWORKS = [
  { key: "instagram_url", label: "Instagram", icon: Instagram },
  { key: "whatsapp_url", label: "WhatsApp", icon: MessageCircleMore },
  { key: "facebook_url", label: "Facebook", icon: Facebook },
  { key: "tiktok_url", label: "TikTok", icon: Music2 },
];

function SocialLinks({ label = "Siguenos", links, variant = "default" }) {
  const visibleNetworks = SOCIAL_NETWORKS.filter(
    ({ key }) => typeof links?.[key] === "string" && links[key].trim(),
  );

  if (visibleNetworks.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.socialLinks} ${styles[variant] || ""}`}>
      <span>{label}</span>
      <div>
        {visibleNetworks.map(({ icon: Icon, key, label: networkLabel }) => (
          <a
            aria-label={`Abrir ${networkLabel}`}
            href={links[key]}
            key={key}
            rel="noreferrer noopener"
            target="_blank"
            title={networkLabel}
          >
            <Icon size={20} aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default SocialLinks;
