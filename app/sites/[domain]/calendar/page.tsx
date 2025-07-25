import { Task } from "@prisma/client";
import CalendarComponent from "@/components/calendar/calendarComponent";
import { prisma } from "../../../prisma-global";
import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
export const revalidate = 0;

async function getData(): Promise<Task[]> {
  // Fetch data from your API here.
  const tasks = await prisma.task.findMany();

  return tasks;
}

async function Page() {
  //get initial data
  const data = await getData();

  const session = await getSession();

  if (!session || !session.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  return (
    <div className="container mx-auto relative ">
      <CalendarComponent tasks={data} />
    </div>
  );
}

export default Page;
