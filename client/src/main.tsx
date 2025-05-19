import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Material Icons
const link = document.createElement("link");
link.href = "file-d/icon.css";
link.rel = "stylesheet";
document.head.appendChild(link);

// Add Tajawal font
const fontLink = document.createElement("link");
fontLink.href = "file-d/css2.css";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Add title
const title = document.createElement("title");
title.textContent = "نظام إدارة التدريب الميداني في الجامعة";
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(<App />);
