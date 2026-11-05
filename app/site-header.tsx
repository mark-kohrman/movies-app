import { Suspense } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import AccountControls from "@/app/account-controls";

type SiteHeaderProps = {
  note?: ReactNode;
  action?: ReactNode;
};

export default function SiteHeader({ note, action }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link aria-label="Rotten Peters home" className="wordmark" href="/">
        <span aria-hidden="true" className="wordmark-icon">
          R
        </span>
        <span>rotten peters</span>
      </Link>
      <div className="site-header-meta">
        {note && <span className="header-note">{note}</span>}
        {action}
      </div>
      <Suspense
        fallback={
          <div className="account-controls">
            <span aria-label="Loading account status" className="header-account">
              …
            </span>
          </div>
        }
      >
        <AccountControls />
      </Suspense>
    </header>
  );
}
