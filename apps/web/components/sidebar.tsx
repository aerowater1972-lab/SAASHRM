'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Building2,
  DollarSign,
  CalendarCheck,
  Clock,
  Wallet,
  FileText,
  Gift,
  Briefcase,
  UserCheck,
  Target,
  BookOpen,
  Star,
  Repeat,
  LogOut,
  UserCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navItems = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Employee & Org',
    items: [
      { href: '/employees', label: 'Employees', icon: Users },
      { href: '/employees/organization', label: 'Organization', icon: Building2 },
      { href: '/employees/movements', label: 'Movements', icon: Repeat },
    ],
  },
  {
    group: 'Time & Attendance',
    items: [
      { href: '/attendance', label: 'Attendance', icon: Clock },
      { href: '/leaves', label: 'Leave', icon: CalendarCheck },
    ],
  },
  {
    group: 'Financial',
    items: [
      { href: '/payroll', label: 'Payroll', icon: Wallet },
      { href: '/payslips', label: 'Payslips', icon: FileText },
      { href: '/expenses', label: 'Expenses', icon: DollarSign },
      { href: '/loans', label: 'Loans', icon: DollarSign },
    ],
  },
  {
    group: 'Benefits & Assets',
    items: [
      { href: '/benefits', label: 'Benefits', icon: Gift },
      { href: '/assets', label: 'Assets', icon: Briefcase },
    ],
  },
  {
    group: 'Recruitment',
    items: [
      { href: '/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/candidates', label: 'Candidates', icon: UserCheck },
      { href: '/recruitment/kanban', label: 'Pipeline', icon: Clock },
    ],
  },
  {
    group: 'Performance',
    items: [
      { href: '/goals', label: 'Goals & OKRs', icon: Target },
      { href: '/reviews', label: 'Reviews', icon: Star },
      { href: '/cycles', label: 'Cycles', icon: Repeat },
      { href: '/learning/trainings', label: 'Learning', icon: BookOpen },
    ],
  },
  {
    group: 'ESS',
    items: [
      { href: '/ess', label: 'ESS Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Other',
    items: [
      { href: '/resignations', label: 'Resignations', icon: LogOut },
      { href: '/profile', label: 'Profile', icon: UserCircle },
      { href: '/admin/roles', label: 'Admin', icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              F
            </div>
            <span className="text-sm">Flexy HRMS</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold mx-auto">
            F
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="hidden lg:flex text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <Separator className="bg-sidebar-muted/30" />
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-4">
          {navItems.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                  {group.group}
                </p>
              )}
              <div className="mt-1 flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-foreground'
                          : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
                        collapsed && 'justify-center px-2',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : '')} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="fixed left-0 top-0 z-50 h-screen w-60 border-r bg-sidebar text-sidebar-foreground">
            <div className="flex h-14 items-center justify-between px-4">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground no-underline">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                  F
                </div>
                <span className="text-sm">Flexy HRMS</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileClose}
                className="text-sidebar-muted hover:text-sidebar-foreground"
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Separator className="bg-sidebar-muted/30" />
            <ScrollArea className="flex-1 px-2 py-2">
              <nav className="flex flex-col gap-4">
                {navItems.map((group) => (
                  <div key={group.group}>
                    <p className="px-3 text-xs font-medium text-sidebar-muted uppercase tracking-wider">
                      {group.group}
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onMobileClose}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-foreground'
                                : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground',
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : '')} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </aside>
        </div>
      )}
    </>
  );
}
