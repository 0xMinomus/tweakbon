import { Wordmark } from './Wordmark';

const linkClass = 'site-footer-link';

const REPO_URL = 'https://github.com/0xMinomus/tweakbon';

const projectLinks = [
  { label: 'Dokumentasi', href: `${REPO_URL}#readme` },
  { label: 'Privasi', href: `${REPO_URL}/blob/master/docs/privacy.md` },
  { label: 'Laporkan masalah', href: `${REPO_URL}/issues/new/choose` },
  { label: 'GitHub', href: REPO_URL },
];

export function SiteFooter() {
  return (
    <footer className="site-footer anim-reveal">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Wordmark className="wordmark site-footer-wordmark" />
          <p>Pasang fotomu ke template twibbon. Semua diproses di perangkatmu.</p>
        </div>

        <nav aria-label="Tautan situs" className="site-footer-col">
          <h2 className="site-footer-heading">Situs</h2>
          <a href="#top" className={linkClass}>Beranda</a>
          <a href="#alur" className={linkClass}>Cara pakai</a>
        </nav>

        <nav aria-label="Tautan proyek" className="site-footer-col">
          <h2 className="site-footer-heading">Proyek</h2>
          {projectLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className={linkClass}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="site-footer-bottom">
        <span>TWEAKBON 2026</span>
        <span>Dibuat untuk twibbon yang cepat dipakai.</span>
      </div>
    </footer>
  );
}
