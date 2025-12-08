"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteSiteModal } from "./DeleteSiteModal";
import { Globe } from "lucide-react";

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
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 mx-auto text-white/40 mb-4" />
        <p className="text-white/70">No sites found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sites.map((site) => (
          <div
            key={site.id}
            className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              {site.image ? (
                <img
                  src={site.image}
                  alt={site.name}
                  className="w-12 h-12 object-contain rounded-lg flex-shrink-0 bg-white/5"
                />
              ) : (
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-white/40" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{site.name}</span>
                  {site.subdomain && (
                    <span className="text-white/60 bg-white/10 px-2 py-0.5 rounded text-sm">
                      {site.subdomain}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/60 mt-1">
                  {site.description && <span>{site.description}</span>}
                  {site.organization && (
                    <span>• {site.organization.name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/administration/sites/${site.id}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border border-white/40 text-white hover:bg-white/20"
                >
                  View
                </Button>
              </Link>
              <Link href={`/administration/sites/${site.id}/edit`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border border-white/40 text-white hover:bg-white/20"
                >
                  Edit
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="border border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-400"
                onClick={() => handleDeleteClick(site.id, site.name)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DeleteSiteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        siteId={deleteModal.siteId}
        siteName={deleteModal.siteName}
      />
    </>
  );
}
