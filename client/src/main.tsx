import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Router } from "wouter";

// ✅ Wrap App with Router and set base for GitHub Pages
createRoot(document.getElementById("root")!).render(
  <Router base="/LearningJournal">
    <App />
  </Router>
);
