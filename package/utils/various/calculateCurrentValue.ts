import { Task } from "@/types/supabase";

export function calculateCurrentValue(data: Task, columnIndex: number) {
  const sellPrice = data.sellPrice || 0;
  let currentValue = 0;
  switch (columnIndex - 1) {
    case 0:
      currentValue = sellPrice * 0;
      break;
    case 1:
      currentValue = sellPrice * 0.25;
      break;
    default:
      break;
  }
  return currentValue;
}
