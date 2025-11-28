"use client"

import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  Moon,
    Sun
} from "lucide-react"

import { useTheme } from "next-themes"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { updateTheme } from "@/app/profile/theme-actions"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
    const { isMobile } = useSidebar()
    const { setTheme } = useTheme()
    const { signOut, user: authUser } = useAuth()
    const router = useRouter()

    const handleThemeChange = async (theme: 'light' | 'dark') => {
        setTheme(theme)
        if (authUser?.uid) {
            await updateTheme(authUser.uid, theme)
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut()
            toast.success('Signed out successfully')
            router.replace('/login', { scroll: false })
        } catch {
            toast.error('Error signing out')
        }
    }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
              <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <BadgeCheck />
                      Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                      <Sun className="h-4 w-4" />
                      Light Theme
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                      <Moon className="h-4 w-4" />
                      Dark Theme
                  </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Log out
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}