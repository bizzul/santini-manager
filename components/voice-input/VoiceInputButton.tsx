"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { VoiceInputDialog } from "./VoiceInputDialog";
import { useSiteModules } from "@/hooks/use-site-modules";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
    domain: string;
    siteId: string;
    onProjectsCreated?: () => void;
}

export function VoiceInputButton({
    domain,
    siteId,
    onProjectsCreated,
}: VoiceInputButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { isModuleEnabled } = useSiteModules(domain);

    // Only show if voice-input module is enabled
    if (!isModuleEnabled("voice-input")) {
        return null;
    }

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsDialogOpen(true)}
                            className="relative"
                        >
                            <Mic className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Crea progetti con la voce</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <VoiceInputDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                siteId={siteId}
                onSuccess={() => {
                    setIsDialogOpen(false);
                    onProjectsCreated?.();
                }}
            />
        </>
    );
}
