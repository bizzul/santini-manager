"use client";
import { PackingControl, PackingItem } from "@/types/supabase";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MobileWorkflowLayout } from "@/components/layout/mobile-workflow-layout";

const ItemCard = ({
  item,
  selected,
  isComplete,
}: {
  item: PackingItem;
  selected: any;
  isComplete: boolean;
}) => {
  return (
    <Card
      onClick={() => selected(item)}
      role="button"
      tabIndex={0}
      className={`h-32 w-64 cursor-pointer select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isComplete
          ? "border-emerald-500/60 bg-emerald-500/10"
          : "hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        <CardDescription>{!isComplete && "INSERIRE I DATI"}</CardDescription>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
};

function SinglePageComponent({
  data,
  user,
}: {
  data: any;
  user: any;
}) {
  const [itemValues, setItemValues] = useState<Map<number, any>>(new Map());
  const [item, setItem] = useState<PackingItem>();
  const [open, setOpen] = useState(false);
  const [numero, setCoprisogliaNumero] = useState("");
  const [pacchi, setNumeroPacchi] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const initialValues = new Map();
    data.items.forEach((packingItem: PackingItem) => {
      initialValues.set(packingItem.id, {
        id: packingItem.id,
        numero: packingItem.number,
        pacchi: packingItem.package_quantity,
      });
    });
    setItemValues(initialValues);
  }, [data.items]);

  function handleClick(packingItem: PackingItem) {
    setItem(packingItem);
    setOpen(true);
    const existingValues = itemValues.get(packingItem.id);
    if (existingValues) {
      setCoprisogliaNumero(existingValues.numero);
      setNumeroPacchi(existingValues.pacchi);
    } else {
      setCoprisogliaNumero("");
      setNumeroPacchi("");
    }
  }

  function saveData() {
    if (item) {
      const updatedValues = new Map(itemValues);
      updatedValues.set(item.id, {
        id: item.id,
        numero: Number(numero),
        pacchi: Number(pacchi),
      });
      setItemValues(updatedValues);
      setOpen(false);
    }
  }

  function isItemComplete(itemId: number) {
    const itemData = itemValues.get(itemId);
    return itemData && itemData.numero !== null && itemData.pacchi !== null;
  }

  async function saveAllData() {
    const payload = Array.from(itemValues.values());
    const requestBody = {
      user: user.sub,
      items: payload,
    };

    const response = await fetch(`/api/packingItems/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const responseData = await response.json();
    if (response.ok) {
      toast({ description: "Aggiornato con successo!" });
      router.push("/boxing/edit");
    } else {
      toast({ description: `Errore nel salvare, ${responseData}` });
    }
  }

  return (
    <MobileWorkflowLayout
      title={
        <span>
          <span className="text-2xl font-semibold">
            {(data as any)?.task?.unique_code}
          </span>
          {(data as any)?.task?.sellProduct?.name && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {(data as any)?.task?.sellProduct?.name}
            </span>
          )}
        </span>
      }
      subtitle={
        <span className="text-sm text-muted-foreground">
          {(data as any)?.task?.client?.businessName} · Aggiungi i valori dei pacchi
        </span>
      }
      back={{ href: "/boxing/edit" }}
      footer={
        <div className="flex justify-end">
          <Button onClick={saveAllData}>Salva ed esci</Button>
        </div>
      }
    >
      <div className="flex flex-wrap justify-center gap-4">
        {data!.items.map((packingItem: PackingItem) => (
          <ItemCard
            key={packingItem.id}
            item={packingItem}
            selected={handleClick}
            isComplete={isItemComplete(packingItem.id)}
          />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{item?.name}</Label>
            <Input
              value={numero}
              onChange={(e) => setCoprisogliaNumero(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            {item?.name === "Guarnizione esterna" ? (
              <Label>Metri</Label>
            ) : (
              <Label>Numero pacchi</Label>
            )}
            <Input
              value={pacchi}
              onChange={(e) => setNumeroPacchi(e.target.value)}
            />
          </div>
          <Button onClick={saveData}>Salva</Button>
        </DialogContent>
      </Dialog>
    </MobileWorkflowLayout>
  );
}

export default SinglePageComponent;
