import { ExternalLink } from "lucide-react";
import { openExternalUrl } from "../../lib/openExternal";
import { useI18n } from "../../lib/i18n";

const DISCORD_INVITE_URL = "https://discord.com/invite/rezxc";

export function AboutPanel() {
  const { t } = useI18n();
  return (
    <section className="about-page full-page-panel">
      <div className="about-content">
        <span className="section-kicker">{t("aboutApplication")}</span>
        <h2>WFMarketTracker</h2>
        <p>{t("aboutText")}</p>
        <div className="about-author">
          <span>{t("createdBy")}</span>
          <strong>convulsiva &lt;3</strong>
        </div>
        <button className="discord-button" type="button" onClick={() => void openExternalUrl(DISCORD_INVITE_URL)}>
          <DiscordIcon />
          <span>{t("joinDiscord")}</span>
          <ExternalLink size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function DiscordIcon() {
  return (
    <svg className="discord-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path fill="currentColor" d="M19.3 5.3A17.4 17.4 0 0 0 15 4l-.5 1.1a16 16 0 0 0-5 0L9 4a17 17 0 0 0-4.3 1.3C2 9.3 1.3 13.2 1.7 17a17.5 17.5 0 0 0 5.3 2.7l1.3-1.8-1.8-.9.4-.3c3.4 1.6 7 1.6 10.3 0l.4.3-1.9.9 1.3 1.8a17.4 17.4 0 0 0 5.3-2.7c.5-4.4-.8-8.3-3-11.7ZM8.5 14.6c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2c1 0 1.9 1 1.9 2.2 0 1.2-.9 2.2-1.9 2.2Zm7 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2c1 0 1.9 1 1.9 2.2 0 1.2-.9 2.2-1.9 2.2Z" />
    </svg>
  );
}
