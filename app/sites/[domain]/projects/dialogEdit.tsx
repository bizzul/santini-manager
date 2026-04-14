"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditTaskKanban from "@/components/kanbans/editKanbanTask";
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

  const handleClose = (_wasDeleted?: boolean) => {
    setOpen(false);
    setData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Modifica {data?.unique_code || "progetto"}</DialogTitle>
        </DialogHeader>
        {data && (
          <EditTaskKanban
            handleClose={handleClose}
            resource={data}
            history={[]}
            open={isOpen}
            setIsLocked={() => {}}
            setOpenModal={setOpen}
            setOpen={setOpen}
            domain={domain}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
