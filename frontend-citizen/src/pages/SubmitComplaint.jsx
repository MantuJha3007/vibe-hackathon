import { useState } from "react";
import ComplaintForm from "../components/ComplaintForm";

export default function SubmitComplaint() {
  const [lastTicket, setLastTicket] = useState(null);
  return (
    <div className="page-container">
      <ComplaintForm onSuccess={setLastTicket} />
    </div>
  );
}
