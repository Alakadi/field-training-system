import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Material Icons
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
link.rel = "stylesheet";
document.head.appendChild(link);

// Add Tajawal font
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Add title
const title = document.createElement("title");
title.textContent = "نظام إدارة التدريب الميداني في الجامعة";
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(<App />);
