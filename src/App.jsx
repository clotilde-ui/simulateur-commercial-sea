import { useState } from "react";
import Simulator from "../marketing-simulator.jsx";
import BackOffice from "./BackOffice.jsx";

export default function App() {
  const [view, setView] = useState("simulator");
  return view === "backoffice"
    ? <BackOffice onBack={() => setView("simulator")} />
    : <Simulator onOpenBackOffice={() => setView("backoffice")} />;
}
