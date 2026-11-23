import Link from 'next/link';
import { footerNav, siteConfig } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-50">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              TF
            </span>
            <span className="font-semibold text-ink">{siteConfig.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-600">
            {siteConfig.description}
          </p>
          <p className="mt-4 text-xs text-slate-500">{siteConfig.legal.entityAddress}</p>
          <p className="mt-1 text-xs text-slate-500">
            <a className="underline underline-offset-2" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
          </p>
        </div>

        {footerNav.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {group.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link className="text-sm text-slate-700 hover:text-brand-700" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalName}. Not affiliated with the Internal
            Revenue Service.
          </p>
          <p>
            Information on this site is general and is not tax or legal advice. Official IRS PDFs
            and instructions control.
          </p>
        </div>
      </div>
    </footer>
  );
}
