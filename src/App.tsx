import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { trackPage } from "./lib/analytics";
import { LanguageProvider, useLang } from "./i18n/LanguageContext";
import { t } from "./i18n/translations";
import { ShopProvider } from "./store/ShopContext";
import { ThemeProvider } from "./store/ThemeContext";
import { Navbar, Footer, FloatingWhatsApp, Toasts } from "./components/chrome";
import { CartDrawer } from "./components/CartDrawer";
import { QuickView } from "./components/QuickView";
import { RouteProgress } from "./components/RouteProgress";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageLoader } from "./components/product";

/* Route-level code splitting: every page is its own chunk; the shell
   (navbar/footer/providers) stays in the main bundle. */
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Contact = lazy(() => import("./pages/Contact"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const CategoriesPage = lazy(() =>
  import("./pages/Contact").then((m) => ({ default: m.CategoriesPage })),
);
const AdminDashboard = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminDashboard })),
);
const AdminLogin = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.AdminLogin })),
);
const NotFound = lazy(() => import("./pages/NotFound"));
const ShippingPolicy = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.ShippingPolicy })),
);
const PrivacyPolicy = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.PrivacyPolicy })),
);
const TermsOfUse = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.TermsOfUse })),
);
const FaqPage = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.FaqPage })),
);

function Shell() {
  const { lang } = useLang();
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#14110e] text-ink dark:text-[#f3ede3]">
      <RouteProgress />
      <Navbar />
      <div className="flex-1">
        <ErrorBoundary title={t("pageError", lang)} action={t("retry", lang)}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
      <FloatingWhatsApp />
      <Toasts />
      <CartDrawer />
      <QuickView />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#14110e] text-ink dark:text-[#f3ede3]">
      <ErrorBoundary title="Admin error" action="Retry">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <Toasts />
    </div>
  );
}

function PageviewProbe() {
  const location = useLocation();
  useEffect(() => {
    trackPage(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ShopProvider>
          <BrowserRouter>
            <PageviewProbe />
            <Routes>
              <Route element={<Shell />}>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/category/:slug" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/policies/shipping" element={<ShippingPolicy />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/login" element={<AdminLogin />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ShopProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
