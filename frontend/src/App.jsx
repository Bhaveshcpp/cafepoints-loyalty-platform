import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Counter from "./pages/Counter";
import MemberList from "./pages/MemberList";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerPortal from "./pages/CustomerPortal";
import QRScanner from "./pages/QRScanner";
import Layout from "./components/Layout";
import "./styles.css";

function Protected({ roles, children }) {
  return <ProtectedRoute allowedRoles={roles}><Layout>{children}</Layout></ProtectedRoute>;
}

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<Login />} />
    <Route path="/customer" element={<CustomerPortal />} />
    <Route path="/staff" element={<Protected roles={["staff","admin"]}><Counter /></Protected>} />
    <Route path="/staff/scan" element={<Protected roles={["staff","admin"]}><QRScanner /></Protected>} />
    <Route path="/members" element={<Protected roles={["staff","admin"]}><MemberList /></Protected>} />
    <Route path="/admin" element={<Protected roles={["admin"]}><AdminDashboard /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
