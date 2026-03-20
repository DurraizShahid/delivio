"use client";

import Link from "next/link";
import { PlatformBrandingMark, usePlatformBranding } from "@delivio/ui";

export function SiteFooter() {
  const { appName } = usePlatformBranding();

  return (
    <footer className="mt-auto border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-sm">
                <PlatformBrandingMark className="size-9 text-base" imgClassName="p-1.5" />
              </div>
              <span className="text-xl font-bold tracking-tight">{appName}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Order food from the best restaurants near you. Fast delivery, easy
              ordering, and great food.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/orders", label: "My Orders" },
                { href: "/cart", label: "Cart" },
                { href: "/account", label: "Account" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="mt-3 space-y-2">
              {["Help Center", "Terms of Service", "Privacy Policy", "Contact Us"].map(
                (label) => (
                  <li key={label}>
                    <span className="text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
                      {label}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Get the app */}
          <div>
            <h3 className="text-sm font-semibold">Get the App</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Download our mobile app for a better experience on the go.
            </p>
            <div className="mt-4 flex gap-2">
              <div className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background">
                App Store
              </div>
              <div className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background">
                Google Play
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
