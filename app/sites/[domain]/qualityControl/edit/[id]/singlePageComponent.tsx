"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

function SinglePageComponent({ data, user }: { data: any; user: any }) {
  const router = useRouter();
  const { toast } = useToast();

  // This will hold the checked state of each item
  const [checkedState, setCheckedState] = useState(new Map<number, boolean>());

  // Initialize the checked state based on passed data
  useEffect(() => {
    const newState = new Map();

    // @ts-ignore

    data.items.forEach((item) => {
      newState.set(item.id, item.checked); // Assuming 'item.checked' is a boolean
    });
    setCheckedState(newState);

    // @ts-ignore
  }, [data.items]);

  // Handle checkbox change
  const handleCheckboxChange = (itemId: number, checked: boolean) => {
    setCheckedState(new Map(checkedState.set(itemId, checked)));
  };

  // Save data to the database
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
      headers: {
        "Content-Type": "application/json", // Indicate that you're sending a JSON body
      },
      body: JSON.stringify(requestBody),
    });
    const responseData = await response.json();

    if (response.ok) {
      toast({
        description: `Aggiornato con successo!`,
      });
      router.push("/qualityControl/edit");
    } else {
      toast({
        description: `Errore nel salvare, ${responseData}`,
      });
    }
  }

  return (
    <div className="flex justify-center w-auto h-auto flex-col items-center  ">
      <div className="py-4 md:w-1/2 w-full md:px-0 px-10">
        <p className="mt-4">
          {/* @ts-ignore */}
          <span className="text-2xl"> {data?.task.unique_code} </span> -{" "}
          <span className="text-md font-light">
            {/* @ts-ignore */}
            {data?.task.sellProduct?.name}{" "}
          </span>
          -{/* @ts-ignore */}
          {data?.task.client?.businessName}
          <span> - Pos.{data.position_nr}</span>
        </p>
        <p>Verificare e cliccare la casella solo se la dicitura è corretta</p>
      </div>

      <div>
        <ul className="space-y-4 py-2">
          {/* @ts-ignore */}
          {data.items.map((item: Qc_item) => (
            <li
              key={item.id}
              className={`py-2 flex items-center justify-start gap-10`}
            >
              <Checkbox
                checked={!!checkedState.get(item.id)}
                onCheckedChange={() =>
                  handleCheckboxChange(item.id, !checkedState.get(item.id))
                }
              />
              <span className="text-left">{item.name}</span>
            </li>
          ))}
        </ul>
        <Button onClick={saveAllData}>Salva ed esci</Button>
      </div>
    </div>
  );
}

export default SinglePageComponent;
