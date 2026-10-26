import Link from "next/link";
import { Shell } from "@/components/site/Page";

export default function NotFound() {
  return (
    <Shell>
      <section className="nm-wrap nm-gutter py-28">
        <h1 className="nm-h1">Nothing runs here.</h1>
        <p className="nm-lede mt-6 max-w-[560px]">This address does not lead to a page. The workloads and the runner are a click away.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="nm-btn primary lg">
            Home
          </Link>
          <Link href="/workloads" className="nm-btn lg">
            Workloads
          </Link>
        </div>
      </section>
    </Shell>
  );
}
