import { Task } from "@/types/supabase";

interface TaskWithDays extends Task {
  daysUntilDue: number;
}
export function taskWithDayRemaining(tasks: TaskWithDays[]) {
  const currentDate = new Date();
  const data = tasks.filter((task: Task) => task.archived !== true);
  const lateTasks = data.map((task: Task) => {
    if (task.deliveryDate) {
      // Check if deliveryDate is not null
      const deliveryDate = new Date(task.deliveryDate);
      const diffInTime = deliveryDate.getTime() - currentDate.getTime();
      const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24)); // convert milliseconds to days

      return { ...task, daysUntilDue: diffInDays }; // Extend task with additional property
    } else {
      return { ...task, daysUntilDue: 0 };
    }
  });
}

export function onlyTaskLateWithDaysRemaining(tasks: TaskWithDays[]) {
  const currentDate = new Date();
  const data = tasks.filter((task: Task) => task.archived !== true);
  const lateTasks = data
    .map((task: Task) => {
      if (task.deliveryDate) {
        // Check if deliveryDate is not null
        const deliveryDate = new Date(task.deliveryDate);
        const diffInTime = deliveryDate.getTime() - currentDate.getTime();
        const diffInDays = Math.round(diffInTime / (1000 * 3600 * 24)); // convert milliseconds to days

        if (diffInDays <= 7) {
          return { ...task, daysUntilDue: diffInDays }; // Extend task with additional property
        }
      }
      return task;
    })
    .filter((task: any) => task.daysUntilDue !== undefined);
  return lateTasks;
}
