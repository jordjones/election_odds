'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MAIN_NAV } from '@/lib/types';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold text-xl">ElectionOdds</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex" viewport={false}>
          <NavigationMenuList>
            {MAIN_NAV.map((item) => (
              <NavigationMenuItem key={item.label}>
                {item.children ? (
                  <>
                    <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[200px] gap-1 p-2">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={child.href}
                                className={cn(
                                  'block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors',
                                  'hover:bg-accent hover:text-accent-foreground',
                                  'focus:bg-accent focus:text-accent-foreground'
                                )}
                              >
                                <div className="text-sm font-medium leading-none">
                                  {child.label}
                                </div>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                        'disabled:pointer-events-none disabled:opacity-50'
                      )}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden ml-auto"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </Button>

        {/* Spacer for desktop */}
        <div className="hidden md:flex flex-1" />

        {/* Last Updated (desktop) */}
        <div className="hidden md:block text-xs text-muted-foreground">
          Updated every 5 min
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container py-4">
            {MAIN_NAV.map((item) => (
              <div key={item.label} className="py-2">
                {item.children ? (
                  <div>
                    <div className="font-medium text-sm text-muted-foreground mb-2">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block py-2 pl-4 text-sm hover:text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="block py-2 text-sm font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
