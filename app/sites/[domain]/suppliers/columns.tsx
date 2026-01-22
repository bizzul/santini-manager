"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

// Extended Supplier type with lastAction and supplier_category
export type SupplierWithAction = {
  id: number;
  name: string;
  short_name?: string | null;
  description?: string | null;
  category?: string | null;
  supplier_category_id?: number | null;
  supplier_category?: {
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
  supplier_image?: string | null;
  lastAction?: {
    createdAt: string;
    type: string;
    User?: {
      given_name: string | null;
      family_name: string | null;
      picture: string | null;
      initials: string | null;
    };
  } | null;
};

// Handler for inline editing suppliers
const createSupplierEditHandler = (domain?: string) => {
  return async (
    rowData: SupplierWithAction,
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
      supplier_category_id: rowData.supplier_category_id,
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
): ColumnDef<SupplierWithAction>[] => {
  const handleSupplierEdit = createSupplierEditHandler(domain);

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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
        />
      ),
    },
    {
      accessorKey: "supplier_category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => {
        const category = row.original.supplier_category;
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
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
          onSave={handleSupplierEdit}
        />
      ),
    },
    {
      accessorKey: "supplier_image",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Logo" />
      ),
      cell: ({ row }) => {
        const image = row.original.supplier_image;
        return image ? (
          <Image src={image} alt={image} width={40} height={40} />
        ) : (
          "N/A"
        );
      },
    },
    {
      accessorKey: "lastAction.createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ultima modifica" />
      ),
      cell: ({ row }) => {
        const lastAction = row.original.lastAction;
        if (!lastAction?.createdAt) return "-";

        const date = new Date(lastAction.createdAt);
        const timeAgo = formatDistanceToNow(date, {
          addSuffix: true,
          locale: it,
        });
        const fullDate = date.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-help">
                  {timeAgo}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fullDate}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "lastAction.User",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Modificato da" />
      ),
      cell: ({ row }) => {
        const lastAction = row.original.lastAction;
        const user = lastAction?.User;

        if (!user) return "-";

        const displayName =
          user.given_name && user.family_name
            ? `${user.given_name} ${user.family_name}`
            : user.given_name || "Utente";

        // Generate initials from name
        const initials =
          user.initials ||
          (user.given_name && user.family_name
            ? `${user.given_name.charAt(0)}${user.family_name.charAt(0)}`
            : user.given_name?.charAt(0) || "U");

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-primary">{initials}</span>
            </div>
            <span className="text-sm truncate">{displayName}</span>
          </div>
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
