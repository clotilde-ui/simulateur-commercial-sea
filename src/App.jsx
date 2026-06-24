import { useState } from "react";
import Simulator from "../marketing-simulator.jsx";
import BackOffice from "./BackOffice.jsx";
import InviteAccept from "./InviteAccept.jsx";

export default function App() {
  const [view, setView] = useState("simulator");

  // Lien d'invitation (?invite=token) → page d'activation du destinataire.
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  if (inviteToken) return <InviteAccept token={inviteToken} />;

  return view === "backoffice"
    ? <BackOffice onBack={() => setView("simulator")} />
    : <Simulator onOpenBackOffice={() => setView("backoffice")} />;
}
