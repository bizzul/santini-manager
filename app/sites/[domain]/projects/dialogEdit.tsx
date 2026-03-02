"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditProductForm from "./editForm";
import { useParams } from "next/navigation";

type Props = {
  data: any;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setData: React.Dispatch<React.SetStateAction<any>>;
};

function DialogEdit({ data, setData, isOpen = false, setOpen }: Props) {
  const params = useParams();
  const domain = params?.domain as string;

  const handleClose = (wasDeleted?: boolean) => {
    setOpen(false);
    setData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-228 max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Modifica {data?.unique_code || "progetto"}</DialogTitle>
        </DialogHeader>
        {data && (
          <EditProductForm
            handleClose={handleClose}
            resource={data}
            domain={domain}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
