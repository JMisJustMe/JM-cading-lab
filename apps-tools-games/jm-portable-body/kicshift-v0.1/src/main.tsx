import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameCanvas } from "./game/GameCanvas";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("JM Portable Body: missing #root mount");

createRoot(root).render(
  <StrictMode>
    <GameCanvas />
  </StrictMode>,
);
