
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { OwnerProfile } from "@/components/owner";

const OwnerDetail = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="container mx-auto p-4">Besitzer-ID fehlt</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">Besitzer Details</h1>
      <OwnerProfile ownerId={id} />
    </div>
  );
};

export default OwnerDetail;
