import * as React from "react";
import { Header } from "./Header";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
  hideNavigation?: boolean;
  hideFooter?: boolean;
  className?: string;
  sidebarContent?: React.ReactNode;
  actionBarContent?: React.ReactNode;
  noPadding?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  hideNavigation = false,
  hideFooter = false,
  className = "",
  sidebarContent,
  actionBarContent,
  noPadding = false,
}) => {
  return (
    <div
      className={`min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 ${className}`}
    >
      <Header />
      <Navigation hide={hideNavigation} />

      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-screen-2xl mx-auto">
        {/* Main content area */}
        <main
          className={`flex-1 w-full ${actionBarContent ? "mb-16 lg:mb-0" : ""}`}
        >
          {children}
        </main>

        {/* Sidebar for desktop */}
        {sidebarContent && (
          <aside className="hidden lg:block lg:w-72 xl:w-80 p-4 flex-shrink-0">
            {sidebarContent}
          </aside>
        )}
      </div>

      {/* Bottom action bar for mobile, hidden on desktop */}
      {actionBarContent && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
          {actionBarContent}
        </div>
      )}

      {!hideFooter && <Footer />}
    </div>
  );
};
