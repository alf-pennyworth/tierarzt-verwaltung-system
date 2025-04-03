
import { useState } from "react";
import { Video } from "lucide-react";

const Telemedicine = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Video className="h-8 w-8 mr-2 text-teal-500" />
        <h1 className="text-2xl font-bold">Telemedizin</h1>
      </div>
      <p>Telemedizin- und virtuelle Konsultationsmodul wird hier implementiert...</p>
    </div>
  );
};

export default Telemedicine;
