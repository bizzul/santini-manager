"use client";
import React, { useState } from "react";
import { useToast } from "../ui/use-toast";
import { Product } from "@/types/supabase";
function MobilePage({ data }: { data: Product }) {
  const [tempQuantity, setTempQuantity] = useState(Number(data.quantity));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(data.quantity);
  const { toast } = useToast();

  const decreaseQty = (quantity: number) => {
    setTempQuantity((prevQty) => {
      if (prevQty - quantity < 0) return 0;
      return prevQty - quantity;
    });
  };

  const increaseQty = (quantity: number) => {
    setTempQuantity((prevQty) => {
      return prevQty + quantity;
    });
  };

  const handleChangeInput = (e: any) => {
    let value = parseInt(e.target.value);
    setTempQuantity(value);
  };

  const updateQuantity = async (newQuantity: number) => {
    try {
      // Ensure newQuantity is valid; return early if not
      if (!newQuantity) {
        toast({
          description: `Imposta una quantita corretta.`,
        });
        return;
      }

      setLoading(true);

      const response = await fetch(
        `/api/inventory/uniqueId/${data.inventoryId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json", // Simplified headers
          },
          body: JSON.stringify(tempQuantity.toString()),
        }
      );

      const result = await response.json();
      // Error handling based on the response
      if (result.error) {
        setError(result.message);
        toast({
          description: `Errore: ${result.error.code}`,
        });
      } else {
        toast({
          description: `Prodotto aggiornato correttamente!`,
        });
        setQuantity(newQuantity); // Update state with the new quantity
      }
    } catch (error) {
      setError("Failed to update the quantity.");
      toast({
        description: "Errore nella richiesta di aggiornamento.",
      });
      console.error("Error updating quantity:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center w-screen h-screen flex-col items-center  text-slate-200  ">
      {error && (
        <div className="bg-red-500 py-8 px-4 w-full text-center font-bold text-xl ">
          <h1>{error}</h1>
          <p className="text-sm">(aggiorna la pagina per riprovare)</p>
        </div>
      )}
      {loading && (
        <div className="absolute top-0 left-0 w-screen h-screen bg-black/50"></div>
      )}
      <h1 className="text-3xl font-bold  my-8">Modifica quantita</h1>
      <h2 className="text-bold text-xl mb-4">Prodotto selezionato</h2>
      <p className="font-extrabold text-2xl text-center">{data.name}</p>
      <p>
        {data.width}x{data.height}x{data.length}
      </p>
      <h3 className="text-bold mb-8">{data.description}</h3>
      <h3 className="text-light text-lg">Tipo: {data.type}</h3>
      <h3 className="text-light mb-8">{data.supplier}</h3>
      <h3>Quantita attuale in magazzino</h3>
      <h2 className="font-bold text-3xl mb-8">
        {quantity} {data.unit}
      </h2>
      <h3>Nuova quantita</h3>
      <div className="mx-24 w-/12 flex justify-center py-4">
        <input
          value={tempQuantity}
          className="border border-white text-3xl font-bold bg-transparent text-center w-2/3"
          type="number"
          onChange={handleChangeInput}
        />
      </div>
      <div className="flex flex-col gap-10 w-full px-4">
        <div className="flex flex-row gap-10 w-full">
          <button
            className="w-full px-5 py-4 m-1 bg-red-600 hover:bg-white hover:text-black transition-colors duration-100 font-bold"
            onClick={() => decreaseQty(10)}
          >
            -10
          </button>
          <button
            className="w-full px-5 py-4 m-1 bg-red-600 hover:bg-white hover:text-black transition-colors duration-100 font-bold"
            onClick={() => decreaseQty(5)}
          >
            -5
          </button>
          <button
            className="w-full px-5 py-4 m-1 bg-red-600 hover:bg-white hover:text-black transition-colors duration-100 font-bold"
            onClick={() => decreaseQty(1)}
          >
            -
          </button>
        </div>
        <div className="flex flex-row gap-10 w-full">
          <button
            className="w-full px-5 py-4 m-1 bg-green-600 hover:bg-white hover:text-black transition-colors duration-100 font-bold"
            onClick={() => increaseQty(1)}
          >
            +
          </button>
          <button
            className="w-full px-5 py-4 m-1 bg-green-600 hover:bg-white hover:text-black transition-colors duration-100 font-bold"
            onClick={() => increaseQty(5)}
          >
            +5
          </button>
          <button
            className="w-full px-5 py-4 m-1 bg-green-600 hover:bg-white hover:text-black transition-colors duration-100 font-bold"
            onClick={() => increaseQty(10)}
          >
            +10
          </button>
        </div>
      </div>
      <div className="flex justify-center align-middle items-center py-8">
        <button
          className=" border border-white  p-4"
          onClick={() => updateQuantity(tempQuantity)}
        >
          CONFERMA
        </button>
      </div>
    </div>
  );
}

export default MobilePage;
