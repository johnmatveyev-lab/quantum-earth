import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { validateEnv } from "./utils/validateEnv";
import App from "./App.tsx";
import "./index.css";

validateEnv();

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
