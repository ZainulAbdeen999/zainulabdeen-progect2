import { Route, Routes, Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MotionRoot from "./components/MotionRoot";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Builder from "./pages/Builder";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminInventory from "./pages/admin/AdminInventory";
// Admin Settings (theme + admin account) and the separate Staff page.
import AdminSettings from "./pages/admin/AdminSettings";
import AdminStaff from "./pages/admin/AdminStaff";
// Rider pages (added with the rider system).
import RiderLogin from "./pages/rider/RiderLogin";
import RiderDashboard from "./pages/rider/RiderDashboard";
import AdminRiders from "./pages/admin/AdminRiders";

function StoreLayout() {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <main id="main">
        <div className="route-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      <MotionRoot />
      <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="build" element={<Builder />} />
        <Route
          path="checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="admin/login" element={<AdminLogin />} />
      <Route
        path="admin"
        element={
          <ProtectedRoute admin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="inventory" element={<AdminInventory />} />
        {/* Admin rider management (added with the rider system). */}
        <Route path="riders" element={<AdminRiders />} />
        {/* Staff information, attendance and payroll (split out of Settings). */}
        <Route path="staff" element={<AdminStaff />} />
        {/* Settings: theme and the admin account only. */}
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Rider sign-in + mobile dashboard (added with the rider system). */}
      <Route path="rider/login" element={<RiderLogin />} />
      <Route
        path="rider"
        element={
          <ProtectedRoute rider>
            <RiderDashboard />
          </ProtectedRoute>
        }
      />
      </Routes>
    </>
  );
}
