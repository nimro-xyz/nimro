import { GlyphBraces, GlyphChain, GlyphGauge, GlyphHammer, GlyphImage, GlyphLayers, GlyphLock, GlyphWorker } from "@/components/site/Icons";

/* What the platform is built from: technologies we actually run, as words with our own generic glyphs. */
const ITEMS = [
  { label: "Web Workers", Icon: GlyphWorker },
  { label: "WebCrypto", Icon: GlyphLock },
  { label: "Robinhood Chain", Icon: GlyphChain },
  { label: "Job scheduler", Icon: GlyphLayers },
  { label: "Live metrics", Icon: GlyphGauge },
  { label: "OffscreenCanvas", Icon: GlyphImage },
  { label: "JSON pipelines", Icon: GlyphBraces },
  { label: "Foundry", Icon: GlyphHammer },
];

export function Marquee() {
  const group = (hidden: boolean) => (
    <ul className="nm-marquee-group" aria-hidden={hidden || undefined}>
      {[...ITEMS, ...ITEMS, ...ITEMS].map((it, i) => (
        <li key={`${it.label}-${i}`} className="nm-marquee-item">
          <it.Icon size={20} />
          {it.label}
        </li>
      ))}
    </ul>
  );
  return (
    <section className="nm-marquee" aria-label="Built with">
      <div className="nm-marquee-window">
        <div className="nm-marquee-track">
          {group(false)}
          {group(true)}
        </div>
      </div>
    </section>
  );
}
