-- CreateEnum
CREATE TYPE "QC_Status" AS ENUM ('NOT_DONE', 'PARTIALLY_DONE', 'DONE');

-- CreateEnum
CREATE TYPE "ClientAddressType" AS ENUM ('CONSTRUCTION_SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- CreateTable
CREATE TABLE "Checklist_item" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "Checklist_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Errortracking" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "error_type" VARCHAR NOT NULL,
    "error_category" TEXT NOT NULL,
    "task_id" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "employee_id" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "description" VARCHAR NOT NULL,

    CONSTRAINT "Errortracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exit_checklist" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "task_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "position" VARCHAR NOT NULL,
    "date" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "Exit_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "inventoryId" SERIAL NOT NULL,
    "type" VARCHAR,
    "description" VARCHAR DEFAULT '',
    "supplier" VARCHAR DEFAULT '',
    "unit_price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "length" DOUBLE PRECISION,
    "total_price" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL,
    "supplierId" INTEGER,
    "categoryId" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellProduct" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SellProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kanban" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,

    CONSTRAINT "Kanban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KanbanColumn" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kanbanId" INTEGER NOT NULL,

    CONSTRAINT "KanbanColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product_category" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,

    CONSTRAINT "Product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "address" TEXT,
    "cap" INTEGER,
    "location" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contact" TEXT,
    "description" VARCHAR NOT NULL,
    "supplier_image" VARCHAR,
    "category" VARCHAR,
    "short_name" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityControl" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "position_nr" TEXT NOT NULL,
    "passed" "QC_Status" NOT NULL DEFAULT 'NOT_DONE',
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "QualityControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qc_item" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "qualityControlId" INTEGER,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Qc_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingControl" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "passed" "QC_Status" NOT NULL DEFAULT 'NOT_DONE',
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PackingControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "package_quantity" INTEGER,
    "packingControlId" INTEGER NOT NULL,

    CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QcMasterItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "QcMasterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingMasterItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PackingMasterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "title" VARCHAR,
    "column_id" INTEGER,
    "column_position" INTEGER,
    "unique_code" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "kanbanColumnId" INTEGER,
    "clientId" INTEGER,
    "kanbanId" INTEGER,
    "other" TEXT,
    "sellPrice" DOUBLE PRECISION,
    "material" BOOLEAN NOT NULL DEFAULT false,
    "percentStatus" INTEGER DEFAULT 0,
    "positions" TEXT[],
    "sellProductId" INTEGER,
    "userId" INTEGER,
    "ferramenta" BOOLEAN NOT NULL DEFAULT false,
    "metalli" BOOLEAN NOT NULL DEFAULT false,
    "name" VARCHAR,
    "stoccato" BOOLEAN DEFAULT false,
    "stoccaggiodate" TIMESTAMP(6),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSupplier" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timetracking" (
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "description" VARCHAR,
    "description_type" VARCHAR NOT NULL DEFAULT 'EXTERNAL',
    "task_id" INTEGER,
    "employee_id" INTEGER,
    "use_cnc" BOOLEAN NOT NULL,
    "endTime" TIMESTAMP(3),
    "startTime" TIMESTAMP(3),
    "totalTime" DOUBLE PRECISION NOT NULL,
    "hours" INTEGER,
    "minutes" INTEGER,

    CONSTRAINT "Timetracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "clientType" "ClientType" NOT NULL DEFAULT 'BUSINESS',
    "clientLanguage" TEXT,
    "individualTitle" TEXT,
    "individualFirstName" TEXT,
    "individualLastName" TEXT,
    "businessName" TEXT,
    "mobilePhone" TEXT,
    "landlinePhone" TEXT,
    "email" TEXT,
    "countryCode" TEXT,
    "zipCode" INTEGER,
    "city" TEXT,
    "address" TEXT,
    "addressExtra" TEXT,
    "code" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAddress" (
    "id" SERIAL NOT NULL,
    "countryCode" TEXT,
    "name" TEXT,
    "lastName" TEXT,
    "mobile" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "zipCode" INTEGER,
    "city" TEXT,
    "address" TEXT,
    "addressExtra" TEXT,
    "typeDetail" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" "ClientAddressType" NOT NULL DEFAULT 'CONSTRUCTION_SITE',
    "clientId" INTEGER,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "authId" TEXT,
    "given_name" TEXT,
    "family_name" TEXT,
    "initials" TEXT,
    "picture" TEXT,
    "color" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "supplierId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "clientId" INTEGER,
    "productId" INTEGER,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloudinaryId" TEXT NOT NULL,
    "taskId" INTEGER,
    "errortrackingId" INTEGER,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskHistory" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RolesToTimetracking" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RolesToTimetracking_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RolesToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RolesToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_inventoryId_key" ON "Product"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Kanban_identifier_key" ON "Kanban"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "KanbanColumn_identifier_key" ON "KanbanColumn"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Task_unique_code_key" ON "Task"("unique_code");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSupplier_taskId_supplierId_key" ON "TaskSupplier"("taskId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "File_cloudinaryId_key" ON "File"("cloudinaryId");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_id_key" ON "Roles"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_name_key" ON "Roles"("name");

-- CreateIndex
CREATE INDEX "_RolesToTimetracking_B_index" ON "_RolesToTimetracking"("B");

-- CreateIndex
CREATE INDEX "_RolesToUser_B_index" ON "_RolesToUser"("B");

-- AddForeignKey
ALTER TABLE "Errortracking" ADD CONSTRAINT "Errortracking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Errortracking" ADD CONSTRAINT "Errortracking_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Errortracking" ADD CONSTRAINT "Errortracking_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exit_checklist" ADD CONSTRAINT "Exit_checklist_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Exit_checklist" ADD CONSTRAINT "Exit_checklist_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Product_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanbanColumn" ADD CONSTRAINT "KanbanColumn_kanbanId_fkey" FOREIGN KEY ("kanbanId") REFERENCES "Kanban"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityControl" ADD CONSTRAINT "QualityControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qc_item" ADD CONSTRAINT "Qc_item_qualityControlId_fkey" FOREIGN KEY ("qualityControlId") REFERENCES "QualityControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingControl" ADD CONSTRAINT "PackingControl_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingControl" ADD CONSTRAINT "PackingControl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_packingControlId_fkey" FOREIGN KEY ("packingControlId") REFERENCES "PackingControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_kanbanColumnId_fkey" FOREIGN KEY ("kanbanColumnId") REFERENCES "KanbanColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_kanbanId_fkey" FOREIGN KEY ("kanbanId") REFERENCES "Kanban"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sellProductId_fkey" FOREIGN KEY ("sellProductId") REFERENCES "SellProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplier" ADD CONSTRAINT "TaskSupplier_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplier" ADD CONSTRAINT "TaskSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetracking" ADD CONSTRAINT "Timetracking_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timetracking" ADD CONSTRAINT "Timetracking_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_errortrackingId_fkey" FOREIGN KEY ("errortrackingId") REFERENCES "Errortracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolesToTimetracking" ADD CONSTRAINT "_RolesToTimetracking_A_fkey" FOREIGN KEY ("A") REFERENCES "Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolesToTimetracking" ADD CONSTRAINT "_RolesToTimetracking_B_fkey" FOREIGN KEY ("B") REFERENCES "Timetracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolesToUser" ADD CONSTRAINT "_RolesToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RolesToUser" ADD CONSTRAINT "_RolesToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
