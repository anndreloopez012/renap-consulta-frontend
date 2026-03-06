import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove Lovable badge whenever it is injected into the DOM
const observer = new MutationObserver(() => {
  const badge = document.getElementById('lovable-badge');
  if (badge) badge.remove();
});
observer.observe(document.body, { childList: true, subtree: true });

createRoot(document.getElementById("root")!).render(<App />);
