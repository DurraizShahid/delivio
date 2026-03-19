"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  MapPin,
  Search,
  ShoppingCart,
  User,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button, cn, ThemeToggle } from "@delivio/ui";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLocationStore } from "@/stores/location-store";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());
  const { isAuthenticated, customer } = useAuthStore();
  const { address, status } = useLocationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const displayAddress =
    address || (status === "granted" ? "Current location" : "Set your location");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-base font-bold text-primary-foreground">D</span>
          </div>
          <span className="hidden text-xl font-bold tracking-tight sm:block">
            Delivio
          </span>
        </Link>

        {/* Location selector */}
        <button
          onClick={() => router.push("/?location=true")}
          className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-3 py-1.5 text-sm transition-all hover:border-primary/30 hover:bg-muted md:flex"
        >
          <MapPin className="size-3.5 text-primary" />
          <span className="max-w-[180px] truncate font-medium">
            {displayAddress}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>

        {/* Search bar — desktop */}
        <div className="relative hidden flex-1 md:block">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for restaurants, cuisines, or dishes..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-10 w-full rounded-full border border-border/60 bg-muted/50 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>

          <ThemeToggle />

          {/* Cart */}
          <Link
            href="/cart"
            className={cn(
              "relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              pathname === "/cart" && "bg-primary/10 text-primary"
            )}
            aria-label="Cart"
          >
            <ShoppingCart className="size-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          {/* Account / Sign in */}
          {isAuthenticated ? (
            <Link
              href="/account"
              className={cn(
                "hidden items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted sm:flex",
                pathname === "/account" && "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              <User className="size-4" />
              <span className="max-w-[100px] truncate">
                {customer?.name || "Account"}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 sm:block"
            >
              Sign in
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="border-t border-border/50 px-4 py-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search restaurants or dishes..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-10 w-full rounded-full border border-border/60 bg-muted/50 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/50 bg-background px-4 py-4 sm:hidden">
          <div className="space-y-1">
            <button
              onClick={() => {
                router.push("/?location=true");
                setMobileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              <MapPin className="size-4 text-primary" />
              <span className="truncate">{displayAddress}</span>
            </button>
            {[
              { href: "/", label: "Home" },
              { href: "/orders", label: "My Orders" },
              { href: "/chat", label: "Messages" },
              { href: "/account", label: "Account" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                  pathname === href && "bg-muted font-medium"
                )}
              >
                {label}
              </Link>
            ))}
            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 block rounded-full bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
