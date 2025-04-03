
import { useState } from "react";
import { CreditCard } from "lucide-react";

const Billing = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <CreditCard className="h-8 w-8 mr-2 text-purple-500" />
        <h1 className="text-2xl font-bold">Abrechnung</h1>
      </div>
      <p>Abrechnungs- und Rechnungsstellungsmodul wird hier implementiert...</p>
    </div>
  );
};

export default Billing;
