"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { deleteSite } from "../actions";
import { useRouter } from "next/navigation";

interface DeleteSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
  onSuccess?: () => void;
}

export function DeleteSiteModal({
  isOpen,
  onClose,
  siteId,
  siteName,
  onSuccess,
}: DeleteSiteModalProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteSite(siteId);
      toast({
        title: "Success",
        description: `Site "${siteName}" has been deleted successfully.`,
      });
      onClose();
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete site",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Site</DialogTitle>
          <div className="space-y-4">
            <DialogDescription>
              Are you sure you want to delete the site &quot;{siteName}&quot;?
              This action cannot be undone.
            </DialogDescription>

            <div className="space-y-3">
              <div className="font-semibold text-amber-700 dark:text-amber-500">
                Warning: Deleting this site will also permanently remove:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>All user associations and access permissions</li>
                <li>All site modules and configurations</li>
                <li>All clients associated with this site</li>
                <li>All site-specific data and settings</li>
                <li>Access to this site for all users</li>
              </ul>
              <div className="text-red-600 font-semibold text-sm">
                This action is irreversible and will affect all related data.
              </div>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
