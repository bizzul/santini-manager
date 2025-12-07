"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteSiteModal } from "./DeleteSiteModal";

interface Site {
  id: string;
  name: string;
  subdomain?: string;
  description?: string;
  image?: string;
  organization?: {
    name: string;
  };
}

interface SitesListProps {
  sites: Site[];
}

export function SitesList({ sites }: SitesListProps) {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    siteId: string;
    siteName: string;
  }>({
    isOpen: false,
    siteId: "",
    siteName: "",
  });

  const handleDeleteClick = (siteId: string, siteName: string) => {
    setDeleteModal({
      isOpen: true,
      siteId,
      siteName,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      siteId: "",
      siteName: "",
    });
  };

  if (!sites || sites.length === 0) {
    return <div className="text-gray-500 italic">No sites found.</div>;
  }

  return (
    <>
      <ul>
        {sites.map((site) => (
          <li
            key={site.id}
            className="mb-2 flex items-center justify-between p-3 border rounded-lg "
          >
            <div className="flex items-center gap-3">
              {site.image ? (
                <img
                  src={site.image}
                  alt={site.name}
                  className="w-12 h-12 object-contain rounded-md flex-shrink-0 bg-muted/30"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-xs">No img</span>
                </div>
              )}
              <div>
                <span className="font-semibold">{site.name}</span>
                {site.subdomain && (
                  <span className="ml-2 text-gray-500">({site.subdomain})</span>
                )}
                {site.description && (
                  <span className="ml-2 text-gray-400">- {site.description}</span>
                )}
                {site.organization && (
                  <span className="ml-2 text-gray-400">
                    - Organization connected: {site.organization.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/administration/sites/${site.id}`}>
                <Button size="sm" variant="outline">
                  View
                </Button>
              </Link>
              <Link href={`/administration/sites/${site.id}/edit`}>
                <Button size="sm" variant="secondary">
                  Edit
                </Button>
              </Link>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteClick(site.id, site.name)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <DeleteSiteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        siteId={deleteModal.siteId}
        siteName={deleteModal.siteName}
      />
    </>
  );
}
