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
