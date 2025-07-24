"use client";
import { PackingControl, PackingItem } from "@prisma/client";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Button } from "../../../../../components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "../../../../../components/ui/use-toast";

const ItemCard = ({
  item,
  selected,
  isComplete,
}: {
  item: PackingItem;
  selected: any;
  isComplete: boolean;
}) => {
  const cardClass = isComplete ? "bg-green-300 text-black" : "";

  return (
    <Card
      onClick={() => selected(item)}
      className={`hover:bg-tremor-background-emphasis pointer-events-auto select-none transition-all duration-500 w-64 h-32 ${cardClass}`}
    >
      <CardHeader>
        {/* @ts-ignore */}
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
  data: PackingControl;
  user: any;
}) {
  const [itemValues, setItemValues] = useState<Map<number, any>>(new Map());
  const [item, setItem] = useState<PackingItem>();
  const [open, setOpen] = useState(false);
  const [numero, setCoprisogliaNumero] = useState(""); // temporary state for input
  const [pacchi, setNumeroPacchi] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  useEffect(() => {
    const initialValues = new Map();
    //@ts-ignore
    data.items.forEach((item: PackingItem) => {
      // Assuming item has properties 'numero' and 'pacchi' for existing data
      initialValues.set(item.id, {
        id: item.id,
        numero: item.number,
        pacchi: item.package_quantity,
      });
    });
    setItemValues(initialValues);
    //@ts-ignore
  }, [data.items]);

  function handleClick(item: PackingItem) {
    setItem(item);
    setOpen(true);
    // Check if we have values for this item and set them, or reset to default
    const existingValues = itemValues.get(item.id);
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
      // Update the item values state with new values associated with the item's ID
      const updatedValues = new Map(itemValues);
      updatedValues.set(item.id, {
        id: item.id,
        numero: Number(numero),
        pacchi: Number(pacchi),
      });
      setItemValues(updatedValues);
      setOpen(false); // Close dialog after saving
    }
  }

  function isItemComplete(itemId: number) {
    const itemData = itemValues.get(itemId);
    return itemData && itemData.numero !== null && itemData.pacchi !== null; // check if fields are set
  }

  async function saveAllData() {
    // Logic for POST request using all values from itemValues
    // Logic for POST request using all values from itemValues
    const payload = Array.from(itemValues.values());

    // Construct a request body that includes both the user and the payload
    const requestBody = {
      user: user.sub, // Include the user's identifier (assuming user.sub is correct)
      items: payload, // Include the payload as an array of items
    };

    const response = await fetch(`/api/packingItems/${data.id}`, {
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
      router.push("/boxing/edit");
    } else {
      toast({
        description: `Errore nel salvare, ${responseData}`,
      });
    }
    // Convert the Map to an array of values
    // const valuesArray = Array.from(itemValues.values());
    // console.log("Processed item values:", valuesArray);
    // Here you would typically send valuesArray to your backend or elsewhere
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
        </p>
        <p>Aggiungi i valori dei pacchi</p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {/* @ts-ignore */}
        {data!.items.map((item: PackingItem) => (
          <ItemCard
            key={item.id}
            item={item}
            selected={handleClick}
            isComplete={isItemComplete(item.id)}
          />
        ))}
      </div>
      <div className="pt-12">
        <Button onClick={saveAllData}>Salva ed esci</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item?.name}</DialogTitle>
            {/* <DialogDescription>
             
            </DialogDescription> */}
          </DialogHeader>
          <div>
            <Label>{item?.name}</Label>
            <Input
              value={numero}
              onChange={(e) => setCoprisogliaNumero(e.target.value)}
              
            />
          </div>
          <div>
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
          <Button onClick={() => saveData()}>Salva</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SinglePageComponent;
