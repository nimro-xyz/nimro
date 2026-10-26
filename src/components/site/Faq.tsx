import { ChevronDown } from "@/components/site/Icons";

export type Qa = { q: string; a: string };

/** Accordion of questions; answers are in the HTML (closed details), so crawlers and FAQ markup see them. */
export function Faq({ items, testid }: { items: Qa[]; testid?: string }) {
  return (
    <div className="nm-faq" data-testid={testid}>
      {items.map((i) => (
        <details key={i.q}>
          <summary>
            <span>{i.q}</span>
            <ChevronDown />
          </summary>
          <p className="a">{i.a}</p>
        </details>
      ))}
    </div>
  );
}
