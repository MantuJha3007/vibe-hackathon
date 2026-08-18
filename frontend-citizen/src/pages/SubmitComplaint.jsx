import { useState } from "react";
import ComplaintForm from "../components/ComplaintForm";

export default function SubmitComplaint() {
  const [lastTicket, setLastTicket] = useState(null);
  return <ComplaintForm onSuccess={setLastTicket} />;
}
