import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppShell } from "../components/layout/AppShell";

function NotFoundComponent() {
  return (
    <AppShell>
      <div className="page-container flex min-h-[60vh] items-center justify-center py-12">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Error 404</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-tight">Page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Index Value Agent — Find blue-chip value inside major indexes" },
      {
        name: "description",
        content:
          "Analyze QQQ, SPY, or DIA, detect high-quality stocks on recent pullback, and get a ranked top 10 report for long-horizon investing.",
      },
      { name: "author", content: "Index Value Agent" },
      { property: "og:title", content: "Index Value Agent — Find blue-chip value inside major indexes" },
      {
        property: "og:description",
        content:
          "Find blue-chip value opportunities hiding inside major indexes — quality + value screening for long-horizon investors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Index Value Agent — Find blue-chip value inside major indexes" },
      { name: "description", content: "Analyzes stock indexes like QQQ, SPY, and DIA to find value stocks." },
      { property: "og:description", content: "Analyzes stock indexes like QQQ, SPY, and DIA to find value stocks." },
      { name: "twitter:description", content: "Analyzes stock indexes like QQQ, SPY, and DIA to find value stocks." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/549e85a4-b502-44bc-a162-ee1fd0516269/id-preview-0cf19865--6d66546b-facb-42fa-99f3-306e63204c09.lovable.app-1776817373893.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/549e85a4-b502-44bc-a162-ee1fd0516269/id-preview-0cf19865--6d66546b-facb-42fa-99f3-306e63204c09.lovable.app-1776817373893.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
