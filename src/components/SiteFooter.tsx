const linkClass = 'site-footer-link';

export function SiteFooter() {
  return (
    <footer className="site-footer anim-reveal">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-logo">TWEAKBON</span>
          <p>Pasang fotomu ke template twibbon. Semua diproses di perangkatmu.</p>
        </div>

        <nav aria-label="Tautan situs" className="site-footer-col">
          <h2 className="site-footer-heading">Situs</h2>
          <a href="#top" className={linkClass}>Beranda</a>
          <a href="#alur" className={linkClass}>Cara pakai</a>
          <a href="#privasi" className={linkClass}>Privasi</a>
        </nav>

        <nav aria-label="Tautan proyek" className="site-footer-col">
          <h2 className="site-footer-heading">Proyek</h2>
          <a
            href="https://github.com/tweakbon/tweakbon"
            target="_blank"
            rel="noreferrer noopener"
            className={linkClass}
          >
            Dokumentasi
          </a>
          <a
            href="https://github.com/tweakbon/tweakbon/issues"
            target="_blank"
            rel="noreferrer noopener"
            className={linkClass}
          >
            Laporkan masalah
          </a>
          <a
            href="https://github.com/tweakbon/tweakbon"
            target="_blank"
            rel="noreferrer noopener"
            className={linkClass}
          >
            GitHub
          </a>
        </nav>
      </div>

      <div className="site-footer-bottom">
        <span>TWEAKBON 2026</span>
        <span>Dibuat untuk twibbon yang cepat dipakai.</span>
      </div>
    </footer>
  );
}
