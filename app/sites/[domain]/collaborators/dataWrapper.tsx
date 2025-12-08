"use client";

import React from "react";
import { DataTable } from "./table";
import { Collaborator } from "./columns";

interface DataWrapperProps {
    data: Collaborator[];
    domain: string;
    siteId: string;
    isAdmin: boolean;
}

const DataWrapper = ({
    data,
    domain,
    siteId,
    isAdmin,
}: DataWrapperProps) => {
    return (
        <div className="w-full">
            <DataTable 
                data={data} 
                domain={domain} 
                siteId={siteId}
                isAdmin={isAdmin}
            />
        </div>
    );
};

export default DataWrapper;

