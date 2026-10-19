import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ShopProvider } from "./store/ShopContext";
import { ThemeProvider } from "./store/ThemeContext";
import { Navbar, Footer, FloatingWhatsApp, Toasts } from "./components/chrome";
import { CartDrawer } from "./components/CartDrawer";
import { QuickView } from "./components/QuickView";
import { RouteProgress } from "./components/RouteProgress";
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

function Shell() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#14110e] text-ink dark:text-[#f3ede3]">
      <RouteProgress />
      <Navbar />
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
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
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ShopProvider>
          <BrowserRouter>
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
              </Route>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/login" element={<AdminLogin />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ShopProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
