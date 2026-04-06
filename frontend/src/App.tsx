import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Mes from "./pages/Mes";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/mes/:mes" element={<Mes />} />
      </Routes>
    </BrowserRouter>
  );
}
