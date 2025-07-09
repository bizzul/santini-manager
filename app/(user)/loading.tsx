import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Grid,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@tremor/react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
function NavProjectsSkeleton() {
  return (
    <SidebarMenu>
      {Array.from({ length: 5 }).map((_, index) => (
        <SidebarMenuItem key={index}>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function Loading() {
  return (
    <main className="px-2 py-4">
      <NavProjectsSkeleton />
      <Skeleton className="w-[200px] h-[50px] " />
      <TabGroup className="mt-6">
        <TabList>
          <Tab>Panoramica</Tab>
          <Tab>Dettagli</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
              {Array.from({ length: 6 }, (v, k) => (
                <Skeleton key={k} className="w-[300px] h-[200px] " />
              ))}
            </Grid>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}

export default Loading;
