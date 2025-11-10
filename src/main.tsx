import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HotelProvider } from "./contexts/HotelContext";

createRoot(document.getElementById("root")!).render(
  <HotelProvider>
    <App />
  </HotelProvider>
);
