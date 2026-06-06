"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditProductForm from "./editForm";

type Props = {
  data: any;
  domain: string;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setData: React.Dispatch<React.SetStateAction<any>>;
};

function DialogEdit({ data, domain, setData, isOpen = false, setOpen }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Modifica categoria</DialogTitle>
          <DialogDescription>Modifica {data?.name}</DialogDescription>
        </DialogHeader>
        <EditProductForm
          data={data}
          domain={domain}
          handleClose={() => {
            setOpen(false), setData(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
