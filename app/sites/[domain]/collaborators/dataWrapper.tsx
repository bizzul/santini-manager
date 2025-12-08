"use client";

import React from "react";
import { DataTable } from "./table";
import { columns, Collaborator } from "./columns";

const DataWrapper = ({
    data,
    domain,
}: {
    data: Collaborator[];
    domain: string;
}) => {
    return (
        <div className="w-full">
            <DataTable columns={columns} data={data} domain={domain} />
        </div>
    );
};

export default DataWrapper;

