"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteSiteModal } from "../DeleteSiteModal";
import { useRouter } from "next/navigation";

interface DeleteSiteButtonProps {
  siteId: string;
  siteName: string;
}

export function DeleteSiteButton({ siteId, siteName }: DeleteSiteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleDeleteSuccess = () => {
    setIsModalOpen(false);
    router.push("/administration/sites");
  };

  return (
    <>
      <Button
        variant="destructive"
        className="ml-2"
        onClick={() => setIsModalOpen(true)}
      >
        Delete Site
      </Button>

      <DeleteSiteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        siteId={siteId}
        siteName={siteName}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
