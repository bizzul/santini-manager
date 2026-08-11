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
      <DialogContent className="flex h-[min(900px,90vh)] max-h-[90vh] w-[1440px] max-w-[min(1440px,95vw)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>Modifica {data?.unique_code || "progetto"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
