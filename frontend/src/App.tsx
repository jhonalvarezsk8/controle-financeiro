import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Mes from "./pages/Mes";
import Dia from "./pages/Dia";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mes/:mes" element={<Mes />} />
        <Route path="/mes/:mes/dia/:dia" element={<Dia />} />
      </Routes>
    </BrowserRouter>
  );
}
