"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import EditProductForm from "./editForm";

type Props = {
  data: any;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setData: React.Dispatch<React.SetStateAction<any>>;
};

function DialogEdit({ data, setData, isOpen = false, setOpen }: Props) {
  const handleClose = () => {
    setOpen(false);
    setData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica progetto</DialogTitle>
          <DialogDescription>
            {data?.name ? `Modifica ${data.name}` : "Modifica progetto"}
          </DialogDescription>
        </DialogHeader>
        {data && <EditProductForm data={data} handleClose={handleClose} />}
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
