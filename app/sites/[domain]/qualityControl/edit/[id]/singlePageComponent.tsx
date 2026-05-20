"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { MobileWorkflowLayout } from "@/components/layout/mobile-workflow-layout";

function SinglePageComponent({ data, user }: { data: any; user: any }) {
  const router = useRouter();
  const { toast } = useToast();

  const [checkedState, setCheckedState] = useState(new Map<number, boolean>());

  useEffect(() => {
    const newState = new Map<number, boolean>();
    data.items.forEach((item: any) => {
      newState.set(item.id, item.checked);
    });
    setCheckedState(newState);
  }, [data.items]);

  const handleCheckboxChange = (itemId: number, checked: boolean) => {
    setCheckedState(new Map(checkedState.set(itemId, checked)));
  };

  async function saveAllData() {
    const payload = Array.from(checkedState, ([id, checked]) => ({
      id,
      checked,
    }));
    const requestBody = {
      user: user.sub,
      items: payload,
    };

    const response = await fetch(`/api/qcItems/${data.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const responseData = await response.json();

    if (response.ok) {
      toast({ description: "Aggiornato con successo!" });
      router.push("/qualityControl/edit");
    } else {
      toast({ description: `Errore nel salvare, ${responseData}` });
    }
  }

  return (
    <MobileWorkflowLayout
      title={
        <span>
          <span className="text-2xl font-semibold">{data?.task.unique_code}</span>
          {data?.task.sellProduct?.name && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {data?.task.sellProduct?.name}
            </span>
          )}
        </span>
      }
      subtitle={
        <span className="text-sm text-muted-foreground">
          {data?.task.client?.businessName} · Pos.{data.position_nr} · Verificare e
          cliccare la casella solo se la dicitura e corretta
        </span>
      }
      back={{ href: "/qualityControl/edit" }}
      footer={
        <div className="flex justify-end">
          <Button onClick={saveAllData}>Salva ed esci</Button>
        </div>
      }
    >
      <ul className="space-y-2">
        {data.items.map((item: any) => (
          <li
            key={item.id}
            className="flex items-center gap-4 rounded-lg border bg-card p-3"
          >
            <Checkbox
              checked={!!checkedState.get(item.id)}
              onCheckedChange={() =>
                handleCheckboxChange(item.id, !checkedState.get(item.id))
              }
            />
            <span className="text-left text-foreground">{item.name}</span>
          </li>
        ))}
      </ul>
    </MobileWorkflowLayout>
  );
}

export default SinglePageComponent;
