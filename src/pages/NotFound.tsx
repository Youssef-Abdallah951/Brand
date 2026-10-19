import { Link } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { t } from "../i18n/translations";
import { usePageNoindex } from "../lib/meta";
import { SearchIcon } from "../components/icons";

export default function NotFound() {
  const { lang } = useLang();
  usePageNoindex();

  return (
    <main className="shell min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="font-display text-6xl font-bold text-bronze/60" aria-hidden="true">404</p>
        <h1 className="font-display text-xl font-bold mt-4 text-ink dark:text-[#f3ede3]">{t("notFoundTitle", lang)}</h1>
        <p className="text-sm text-mute dark:text-[#a89f92] mt-2 max-w-sm mx-auto">{t("notFoundSub", lang)}</p>
        <div className="flex items-center justify-center gap-3 mt-7">
          <Link to="/" className="bg-ink text-[#f3ede3] hover:bg-bronze-deep font-bold text-sm px-8 py-3.5 rounded-full transition btn-press">
            {t("backHome", lang)}
          </Link>
          <Link to="/shop" className="inline-flex items-center gap-2 border border-ink dark:border-[#f3ede3] text-ink dark:text-[#f3ede3] hover:bg-sand dark:hover:bg-[#201a15] font-bold text-sm px-8 py-3.5 rounded-full transition btn-press">
            <SearchIcon className="w-4 h-4" /> {t("shopAll", lang)}
          </Link>
        </div>
      </div>
    </main>
  );
}
