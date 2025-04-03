
import { useState } from "react";
import { Calendar } from "lucide-react";

const Appointments = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Calendar className="h-8 w-8 mr-2 text-green-500" />
        <h1 className="text-2xl font-bold">Terminplanung</h1>
      </div>
      <p>Terminplanungs- und Kalenderverwaltungsmodul wird hier implementiert...</p>
    </div>
  );
};

export default Appointments;
