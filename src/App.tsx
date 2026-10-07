import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { LanguageProvider } from "./i18n/LanguageContext";
import { ShopProvider } from "./store/ShopContext";
import { Navbar, Footer, FloatingWhatsApp, Toasts } from "./components/chrome";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import TrackOrder from "./pages/TrackOrder";
import Contact, { CategoriesPage } from "./pages/Contact";
import { AdminDashboard, AdminLogin } from "./pages/Admin";

function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <FloatingWhatsApp />
      <Toasts />
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#fff9fb]">
      <Outlet />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ShopProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
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
  );
}
