import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "@marmoui/ui/style.css";
import "./styles.css";

// The playground chrome is dark; Marmo components follow via the .dark class.
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
