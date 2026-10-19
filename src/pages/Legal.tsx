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
        لأي استفسار بخصوص هذه السياسة، تواصلي معنا على{" "}
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
  usePageMeta(`${t("policyShipping", lang)} | JiA`, t("heroSub", lang));
  return (
    <Shell title={t("policyShipping", lang)}>
      {/* TODO(legal): replace with reviewed shipping + returns copy */}
      <H>مدة التجهيز</H>
      <p>يتم تجهيز جميع الطلبات داخل ١–٢ يوم عمل من تأكيد الطلب، وتصل طلبات القاهرة والجيزة عادة خلال ٢–٤ أيام عمل، وباقي المحافظات ٣–٥ أيام عمل.</p>
      <H>الاستبدال والإرجاع</H>
      <p>يمكنكِ استبدال أو إرجاع أي قطعة خلال ١٤ يوماً من الاستلام، بشرط ألا تكون مستخدمة وأن تظل بغلافها الأصلي وبطاقتها. لا تُستبدل منتجات العناية أو مستلزمات الهدايا المفتوحة.</p>
      <H>رسوم الشحن</H>
      <p>الشحن القياسي مجاني للطلبات فوق {SITE_CONFIG.delivery.freeThreshold} جنيه، وتُحسب رسوم الشحن السريع حسب المحافظة وتظهر بوضوح قبل تأكيد الطلب.</p>
      <H>الدفع عند الاستلام</H>
      <p>جميع الطلبات تكون الدفع فيها كاش عند الاستلام فقط، ولا توجد أي دفعات إلكترونية مقدمة.</p>
    </Shell>
  );
}

export function PrivacyPolicy() {
  const { lang } = useLang();
  usePageMeta(`${t("policyPrivacy", lang)} | JiA`, t("heroSub", lang));
  return (
    <Shell title={t("policyPrivacy", lang)}>
      {/* TODO(legal): replace with reviewed privacy copy */}
      <H>البيانات التي نجمعها</H>
      <p>نجمع فقط ما نحتاجه لتوصيل طلبك: الاسم، رقم الموبايل، العنوان، وتفاصيل المنتجات المطلوبة. لا نطلب أي بيانات بنكية إطلاقاً لأن الدفع كاش عند الاستلام.</p>
      <H>كيف نستخدم بياناتك</H>
      <p>تُستخدم بياناتك في تجهيز الطلب وتنسيق التوصيل مع مندوب الشحن فقط، ولا نستخدمها لأي رسائل تسويقية إلا بموافقتك الصريحة.</p>
      <H>مشاركة البيانات</H>
      <p>نشارك بيانات التوصيل مع شركة الشحن فقط، ولا نبيع أو نشارك أي بيانات مع أي جهة خارجية لأي غرض آخر.</p>
      <H>حقوقك</H>
      <p>يمكنكِ طلب حذف بياناتك أو الاستفسار عنها في أي وقت عبر التواصل معنا على الرقم الموضح أسفل الصفحة.</p>
    </Shell>
  );
}

export function TermsOfUse() {
  const { lang } = useLang();
  usePageMeta(`${t("policyTerms", lang)} | JiA`, t("heroSub", lang));
  return (
    <Shell title={t("policyTerms", lang)}>
      {/* TODO(legal): replace with reviewed terms copy */}
      <H>استخدام الموقع</H>
      <p>باستخدامك للموقع فإنك توافقين على إتمام الطلبات ببيانات صحيحة وكاملة، وأي طلب ببيانات خاطئة قد يُلغى دون إشعار.</p>
      <H>الأسعار والتوفر</H>
      <p>جميع الأسعار بالجنيه المصري وتشمل قيمة المنتج فقط، وقد يتغير توفر القطع دون إشعار مسبق. في حال نفاد قطعة بعد الطلب، نتواصل معكِ لإكمال أو استرجاع قيمة الطلب.</p>
      <H>صور المنتجات</H>
      <p>نحرص على أن تعكس الصور المنتج الحقيقي، مع الأخذ في الاعتبار أن الاختلافات البسيطة في درجات الشاشة واردة.</p>
      <H>المحتوى</H>
      <p>جميع الصور والنصوص في هذا الموقع ملك لمتجر JiA ولا يجوز استخدامها تجارياً دون إذن كتابي.</p>
    </Shell>
  );
}

const FAQS: { q: { en: string; ar: string }; a: { en: string; ar: string } }[] = [
  {
    q: { en: "Is cash on delivery available?", ar: "هل الدفع عند الاستلام متاح؟" },
    a: { en: "Yes — cash on delivery is the only payment method. Pay the courier when your order arrives.", ar: "نعم، الدفع عند الاستلام هو طريقة الدفع الوحيدة. ادفعي كاش للمندوب عند وصول الطلب." },
  },
  {
    q: { en: "How long does shipping take?", ar: "كم يستغرق الشحن؟" },
    a: { en: "Cairo & Giza usually arrive within 2–4 business days; other governorates 3–5 business days.", ar: "القاهرة والجيزة عادة ٢–٤ أيام عمل، وباقي المحافظات ٣–٥ أيام عمل." },
  },
  {
    q: { en: "Do you ship to all governorates?", ar: "هل يوجد شحن لكل المحافظات؟" },
    a: { en: "Yes, we deliver to all Egyptian governorates.", ar: "نعم، يوجد توصيل لجميع محافظات مصر." },
  },
  {
    q: { en: "Can I return or exchange an item?", ar: "هل يمكنني الاستبدال أو الإرجاع؟" },
    a: { en: "Within 14 days of delivery if the piece is unused and in its original packaging.", ar: "خلال ١٤ يوماً من الاستلام، بشرط ألا تكون القطعة مستخدمة وتظل بغلافها الأصلي." },
  },
  {
    q: { en: "How do I follow up on my order?", ar: "كيف أتابع حالة طلبي؟" },
    a: { en: "Keep the order number from your confirmation page and message us on WhatsApp — we will update you until your order arrives.", ar: "احفظي رقم الطلب من صفحة التأكيد وراسلينا على واتساب — سنوافيك بتحديثات الطلب حتى وصوله إليك." },
  },
  {
    q: { en: "Is free shipping available?", ar: "هل يوجد شحن مجاني؟" },
    a: { en: "Standard shipping is free for orders above 1500 EGP.", ar: "الشحن القياسي مجاني للطلبات فوق ١٥٠٠ جنيه." },
  },
];

export function FaqPage() {
  const { lang } = useLang();
  usePageMeta(`${t("faq", lang)} | JiA`, t("heroSub", lang));
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
