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
import { useToast } from "@/components/ui/use-toast";
import { removeItem } from "./actions/delete-item.action";
import { useState } from "react";

const initialState = {
  message: null,
};

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
        description: `Errore! ${response.message}`,
      });
      setPending(false);
    } else {
      toast({
        description: `Elemento eliminato!`,
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
          <DialogTitle>Cancellare {data?.id}</DialogTitle>
          <DialogDescription>Azione irreversibile</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="w-full">
          <Button
            aria-disabled={pending}
            variant="destructive"
            className="w-full"
            type="submit"
          >
            Cancella
          </Button>
        </form>
        <Button
          onClick={() => {
            setOpen(false), setData(null);
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
