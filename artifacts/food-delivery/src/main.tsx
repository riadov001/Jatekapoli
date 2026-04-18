import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./i18n";
import "./index.css";

setAuthTokenGetter(() => localStorage.getItem("tawsila_token"));

createRoot(document.getElementById("root")!).render(<App />);
