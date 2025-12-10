"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { removeItem } from "./actions/delete-item.action";
import { useState } from "react";

type Props = {
  data: any;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setData: React.Dispatch<React.SetStateAction<any>>;
};

function DialogDelete({ data, setData, isOpen = false, setOpen }: Props) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const response = await removeItem(data);
    if (response?.message) {
      toast({
        variant: "destructive",
        description: `Errore! ${response.message}`,
      });
      setPending(false);
    } else {
      toast({
        description: `Categoria eliminata!`,
      });
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogTrigger asChild></DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Eliminare {data?.name}?</DialogTitle>
          <DialogDescription>
            Questa azione è irreversibile. La categoria verrà eliminata
            permanentemente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="w-full">
          <Button
            aria-disabled={pending}
            variant="destructive"
            className="w-full"
            type="submit"
            disabled={pending}
          >
            {pending ? "Eliminazione..." : "Elimina"}
          </Button>
        </form>
        <Button
          onClick={() => {
            setOpen(false);
            setData(null);
          }}
          variant="secondary"
        >
          Annulla
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default DialogDelete;
