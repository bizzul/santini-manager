"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

// Extended Manufacturer type with manufacturer_category
export type ManufacturerWithAction = {
  id: number;
  name: string;
  short_name?: string | null;
  description?: string | null;
  manufacturer_category_id?: number | null;
  manufacturer_category?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  address?: string | null;
  cap?: number | null;
  location?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  contact?: string | null;
  manufacturer_image?: string | null;
};

// Handler for inline editing manufacturers
const createManufacturerEditHandler = (domain?: string) => {
  return async (
    rowData: ManufacturerWithAction,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData = {
      name: rowData.name,
      short_name: rowData.short_name,
      description: rowData.description,
      address: rowData.address,
      cap: rowData.cap,
      location: rowData.location,
      website: rowData.website,
      email: rowData.email,
      phone: rowData.phone,
      contact: rowData.contact,
      manufacturer_category_id: rowData.manufacturer_category_id,
      [field]: newValue,
    };

    try {
      const result = await editItem(formData, rowData.id, domain);
      if (result?.message || result?.error) {
        return { error: result.message || result.error };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

export const createColumns = (
  domain?: string
): ColumnDef<ManufacturerWithAction>[] => {
  const handleManufacturerEdit = createManufacturerEditHandler(domain);

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleziona tutti"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleziona riga"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.name}
          row={row}
          field="name"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "short_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Abbreviato" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.short_name}
          row={row}
          field="short_name"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrizione" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.description}
          row={row}
          field="description"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "manufacturer_category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => {
        const category = row.original.manufacturer_category;
        if (!category) return "-";
        return (
          <span>
            {category.code && `[${category.code}] `}
            {category.name}
          </span>
        );
      },
    },
    {
      accessorKey: "address",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Indirizzo" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.address}
          row={row}
          field="address"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "cap",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cap." />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.cap}
          row={row}
          field="cap"
          type="number"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "location",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.location}
          row={row}
          field="location"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "website",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Website" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.website}
          row={row}
          field="website"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.email}
          row={row}
          field="email"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Telefono" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.phone}
          row={row}
          field="phone"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "contact",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contatto" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.contact}
          row={row}
          field="contact"
          type="text"
          onSave={handleManufacturerEdit}
        />
      ),
    },
    {
      accessorKey: "manufacturer_image",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Logo" />
      ),
      cell: ({ row }) => {
        const image = row.original.manufacturer_image;
        return image ? (
          <Image src={image} alt={image} width={40} height={40} />
        ) : (
          "N/A"
        );
      },
    },
    {
      id: "actions",
      header: "Azioni",
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ];
};

// Legacy export for backward compatibility
export const columns = createColumns();
