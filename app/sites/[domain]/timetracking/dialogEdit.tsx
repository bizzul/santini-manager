"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EditProductForm from "./editForm";
import { User, Roles, Task } from "@/types/supabase";

type Props = {
  data: any;
  isOpen: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setData: React.Dispatch<React.SetStateAction<any>>;
  users?: User[];
  roles?: Roles[];
  tasks?: Task[];
};

function DialogEdit({
  data,
  setData,
  isOpen = false,
  setOpen,
  users = [],
  roles = [],
  tasks = [],
}: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(!isOpen)}>
      <DialogContent className="sm:max-w-[40%] max-h-[90%] overflow-scroll">
        <DialogHeader>
          <DialogTitle>Modifica ora di lavoro </DialogTitle>
          <DialogDescription>Modifica {data?.name}</DialogDescription>
        </DialogHeader>
        <EditProductForm
          data={data}
          handleClose={() => {
            setOpen(false), setData(null);
          }}
          users={users}
          roles={roles}
          tasks={tasks}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogEdit;
