
import { useState } from "react";
import { Package2 } from "lucide-react";

const Inventory = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Package2 className="h-8 w-8 mr-2 text-yellow-500" />
        <h1 className="text-2xl font-bold">Inventar</h1>
      </div>
      <p>Inventar- und Lagermodul wird hier implementiert...</p>
    </div>
  );
};

export default Inventory;
