"use client";

import React from "react";
import DialogCreate from "./dialogCreate";
import { VoiceInputButton } from "@/components/voice-input";
import { Data } from "./page";

interface ProjectsHeaderProps {
    data: Data;
    domain: string;
    siteId: string;
}

export function ProjectsHeader({ data, domain, siteId }: ProjectsHeaderProps) {
    return (
        <div className="flex items-center gap-2">
            <VoiceInputButton domain={domain} siteId={siteId} />
            <DialogCreate data={data} />
        </div>
    );
}
