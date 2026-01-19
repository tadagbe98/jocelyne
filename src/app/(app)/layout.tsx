import Logo from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { PageHeader } from "@/components/page-header";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
             <Logo className="size-7 group-data-[collapsible=icon]:size-8" />
            <span className="text-lg font-semibold font-headline group-data-[collapsible=icon]:hidden">
              ImpactBiz
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
      </Sidebar>
      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 flex items-center h-16 px-4 border-b bg-background/80 backdrop-blur-sm md:hidden">
          <SidebarTrigger className="md:hidden">
            <Logo className="size-6"/>
          </SidebarTrigger>
          <h1 className="ml-4 text-lg font-semibold font-headline">ImpactBiz</h1>
        </header>
        <SidebarInset>
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </SidebarInset>
      </div>
    </div>
  );
}
