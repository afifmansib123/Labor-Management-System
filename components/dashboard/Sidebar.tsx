'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  LayoutDashboard,
  Users,
  MapPin,
  Briefcase,
  DollarSign,
  LogOut,
  Menu,
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  if (!session) return null

  const masterAdminRoutes = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/jobs', label: 'Job Management', icon: Briefcase },
    { href: '/dashboard/partners', label: 'Partner Management', icon: Users },
    { href: '/dashboard/workforce', label: 'Workforce Management', icon: Users },
    { href: '/dashboard/financial', label: 'Financial Management', icon: DollarSign },
  ]

  const partnerRoutes = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/workforce', label: 'Workforce Management', icon: Users },
    { href: '/dashboard/financial', label: 'Financial', icon: DollarSign },
  ]

  const staffRoutes = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/workforce', label: 'Workforce Management', icon: Users },
    { href: '/dashboard/jobs', label: 'Job Management', icon: Briefcase },
    { href: '/dashboard/payments', label: 'Payments', icon: DollarSign },
  ]

  let routes = masterAdminRoutes

  if (session.user?.role === 'partner') {
    routes = partnerRoutes
  } else if (session.user?.role === 'staff') {
    routes = staffRoutes
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth/login' })
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-start"
        >
          <Menu className="w-4 h-4 mr-2" />
          Menu
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'block' : 'hidden'
        } lg:block fixed lg:relative left-0 top-0 w-64 h-screen bg-card border-r border-border z-40`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold">Labor Management</h1>
          <p className="text-xs text-muted-foreground mt-1">{session.user?.role}</p>
        </div>

        <nav className="p-4 space-y-2">
          {routes.map((route) => {
            const Icon = route.icon
            const isActive = pathname === route.href

            return (
              <Link key={route.href} href={route.href}>
                <div
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{route.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <p className="text-xs text-muted-foreground px-4">
            {session.user?.email}
          </p>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
