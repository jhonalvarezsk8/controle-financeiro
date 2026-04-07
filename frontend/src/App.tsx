import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Mes from "./pages/Mes";
import Dia from "./pages/Dia";
import Login from "./pages/Login";
import "./index.css";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/mes/:mes" element={<PrivateRoute><Mes /></PrivateRoute>} />
        <Route path="/mes/:mes/dia/:dia" element={<PrivateRoute><Dia /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
