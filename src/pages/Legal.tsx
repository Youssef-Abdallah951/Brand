import { useLang } from "../i18n/LanguageContext";
import { t } from "../i18n/translations";
import { usePageMeta } from "../lib/meta";
import { SITE_CONFIG } from "../lib/siteConfig";

/* PLACEHOLDER LEGAL COPY — the Arabic text below is a sensible draft, NOT
 * reviewed by a lawyer. Replace with final copy before launch (README lists
 * this as a pre-launch TODO). */

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="shell pt-8 pb-16 max-w-3xl">
      <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">{title}</h1>
      <div className="mt-6 grid gap-4 text-sm leading-relaxed text-mute dark:text-[#a89f92]" dir="rtl">
        {children}
      </div>
      <p className="mt-8 text-xs text-mute/80 dark:text-[#8d8478] border-t border-line dark:border-[#2e2822] pt-4">
        لو عندك أي استفسار بخصوص السياسة دي، كلمينا على{" "}
        <a href={SITE_CONFIG.admin.telLink} className="text-bronze underline underline-offset-4" dir="ltr">{SITE_CONFIG.admin.phoneLocal}</a>
      </p>
    </main>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display font-bold text-ink dark:text-[#f3ede3] text-base mt-2">{children}</h2>
);

export function ShippingPolicy() {
  const { lang } = useLang();
  usePageMeta(`${t("policyShipping", lang)} | Jia`, t("heroSub", lang));
  return (
    <Shell title={t("policyShipping", lang)}>
      {/* TODO(legal): replace with reviewed shipping + returns copy */}
      <H>مدة التجهيز</H>
      <p>بنجهز كل الطلبات خلال ١–٢ يوم عمل من تأكيد الطلب. طلبات القاهرة والجيزة بتوصل عادة خلال ٢–٤ أيام عمل، وباقي المحافظات خلال ٣–٥ أيام عمل.</p>
      <H>الاستبدال والإرجاع</H>
      <p>تقدري تستبدلي أو ترجعي أي قطعة خلال ١٤ يوم من الاستلام، بشرط إن القطعة تكون متستخدمتش وتبقى في غلافها الأصلي وببطاقتها. منتجات العناية أو مستلزمات الهدايا اللي اتفتحت مبتتستبدلش.</p>
      <H>رسوم الشحن</H>
      <p>الشحن العادي مجاني للطلبات فوق {SITE_CONFIG.delivery.freeThreshold} جنيه، ورسوم الشحن السريع بتختلف حسب المحافظة وبتظهر بوضوح قبل تأكيد الطلب.</p>
      <H>الدفع عند الاستلام</H>
      <p>كل الطلبات بتتدفع كاش عند الاستلام فقط — مفيش أي دفع إلكتروني مقدم.</p>
    </Shell>
  );
}

export function PrivacyPolicy() {
  const { lang } = useLang();
  usePageMeta(`${t("policyPrivacy", lang)} | Jia`, t("heroSub", lang));
  return (
    <Shell title={t("policyPrivacy", lang)}>
      {/* TODO(legal): replace with reviewed privacy copy */}
      <H>البيانات اللي بنجمعها</H>
      <p>بنجمع بس اللي محتاجينه لتوصيل طلبك: الاسم، رقم الموبايل، العنوان، وتفاصيل المنتجات المطلوبة. مش بنطلب أي بيانات بنكية خالص لأن الدفع كاش عند الاستلام.</p>
      <H>إزاي بنستخدم بياناتك</H>
      <p>بياناتك بتتستخدم في تجهيز الطلب وتنسيق التوصيل مع شركة الشحن بس، ومش بنستخدمها في أي رسائل تسويقية غير بموافقتك الصريحة.</p>
      <H>مين بنشارك بياناتك معاه</H>
      <p>بنشارك بيانات التوصيل مع شركة الشحن بس، ومش بنبيع أو نشارك أي بيانات مع أي جهة خارجية لأي غرض تاني.</p>
      <H>حقوقك</H>
      <p>تقدري في أي وقت تطلبي حذف بياناتك أو تسألي عنها من خلال التواصل معانا على الرقم اللي تحت في الصفحة.</p>
    </Shell>
  );
}

export function TermsOfUse() {
  const { lang } = useLang();
  usePageMeta(`${t("policyTerms", lang)} | Jia`, t("heroSub", lang));
  return (
    <Shell title={t("policyTerms", lang)}>
      {/* TODO(legal): replace with reviewed terms copy */}
      <H>استخدام الموقع</H>
      <p>باستخدامك الموقع إنتي موافقة إنك تكملي الطلبات ببيانات صحيحة وكاملة، وأي طلب ببيانات غلط ممكن يتلغي من غير إشعار.</p>
      <H>الأسعار والتوفر</H>
      <p>كل الأسعار بالجنيه المصري وتشمل قيمة المنتج بس، وممكن توفر القطع يتغير من غير إشعار مسبق. لو قطعة خلصت بعد الطلب، هنكلمك نكمل الطلب أو نرجعلك قيمته.</p>
      <H>صور المنتجات</H>
      <p>بنحاول خالص إن الصور تعبر عن المنتج الحقيقي، مع مراعاة إن ممكن تحصل اختلافات بسيطة حسب إعدادات الشاشة.</p>
      <H>المحتوى</H>
      <p>كل الصور والنصوص في الموقع ده ملك لمتجر Jia وممنوع استخدامها تجارياً من غير إذن مكتوب.</p>
    </Shell>
  );
}

const FAQS: { q: { en: string; ar: string }; a: { en: string; ar: string } }[] = [
  {
    q: { en: "Is cash on delivery available?", ar: "الدفع عند الاستلام متاح؟" },
    a: { en: "Yes — cash on delivery is the only payment method. Pay the courier when your order arrives.", ar: "أيوه، الدفع عند الاستلام هو طريقة الدفع الوحيدة. ادفعي كاش للمندوب لما الطلب يوصلك." },
  },
  {
    q: { en: "How long does shipping take?", ar: "الشحن بياخد قد إيه؟" },
    a: { en: "Cairo & Giza usually arrive within 2–4 business days; other governorates 3–5 business days.", ar: "القاهرة والجيزة عادة ٢–٤ أيام عمل، وباقي المحافظات ٣–٥ أيام عمل." },
  },
  {
    q: { en: "Do you ship to all governorates?", ar: "في شحن لكل المحافظات؟" },
    a: { en: "Yes, we deliver to all Egyptian governorates.", ar: "أيوه، بنوصل لكل محافظات مصر." },
  },
  {
    q: { en: "Can I return or exchange an item?", ar: "أقدر أستبدل أو أرجّع القطعة؟" },
    a: { en: "Within 14 days of delivery if the piece is unused and in its original packaging.", ar: "خلال ١٤ يوم من الاستلام، بشرط إن القطعة تكون متستخدمتش وتبقى في غلافها الأصلي." },
  },
  {
    q: { en: "How do I follow up on my order?", ar: "أتابع طلبي إزاي؟" },
    a: { en: "Keep the order number from your confirmation page and message us on WhatsApp — we will update you until your order arrives.", ar: "احفظي رقم الطلب من صفحة التأكيد وابعتيلنا على واتساب — هنبعتلك تحديثات الطلب لحد ما يوصلك." },
  },
  {
    q: { en: "Is free shipping available?", ar: "في شحن مجاني؟" },
    a: { en: `Standard shipping is free for orders above ${SITE_CONFIG.delivery.freeThreshold} EGP.`, ar: `الشحن العادي مجاني للطلبات فوق ${SITE_CONFIG.delivery.freeThreshold} جنيه.` },
  },
];

export function FaqPage() {
  const { lang } = useLang();
  usePageMeta(`${t("faq", lang)} | Jia`, t("heroSub", lang));
  return (
    <main className="shell pt-8 pb-16 max-w-3xl">
      <h1 className="font-display t-h2 font-bold text-ink dark:text-[#f3ede3]">{t("faq", lang)}</h1>
      <div className="mt-6 grid gap-3">
        {FAQS.map((f, i) => (
          <details key={i} className="bg-cream dark:bg-[#191512] border border-line dark:border-[#2e2822] rounded-2xl px-5 py-4 group">
            <summary className="cursor-pointer font-bold text-sm text-ink dark:text-[#f3ede3] select-none marker:content-none flex items-center justify-between gap-3">
              <span>{lang === "ar" ? f.q.ar : f.q.en}</span>
              <span className="text-bronze text-lg leading-none transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="text-sm text-mute dark:text-[#a89f92] mt-3 leading-relaxed" dir="auto">{lang === "ar" ? f.a.ar : f.a.en}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
