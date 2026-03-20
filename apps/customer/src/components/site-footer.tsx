"use client";

import Link from "next/link";
import {
  PlatformBrandingMark,
  PlatformWordmark,
  usePlatformBranding,
} from "@delivio/ui";

export function SiteFooter() {
  const { appName, helpUrl, supportEmail } = usePlatformBranding();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border/40 bg-gradient-to-b from-muted/40 via-muted/25 to-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/20 ring-2 ring-primary/15">
                <PlatformBrandingMark className="size-9 text-base" imgClassName="p-1.5" />
              </div>
              <PlatformWordmark>
                <span className="text-xl font-bold tracking-tight">{appName}</span>
              </PlatformWordmark>
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
              {helpUrl ? (
                <li>
                  <a
                    href={helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Help center
                  </a>
                </li>
              ) : null}
              {supportEmail ? (
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {supportEmail}
                  </a>
                </li>
              ) : null}
              {["Terms of Service", "Privacy Policy"].map((label) => (
                <li key={label}>
                  <span className="text-sm text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Get the app */}
          <div>
            <h3 className="text-sm font-semibold">Get the App</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Download our mobile app for a better experience on the go.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-sm">
                App Store
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-sm">
                Google Play
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
