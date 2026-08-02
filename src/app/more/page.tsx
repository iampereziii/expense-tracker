import Link from "next/link";
import { Card } from "@/components/ui/Card";

/** Small static hub for the rarely-touched screens (Report joins when unparked). */
export default function MorePage() {
  return (
    <section className="pt-6">
      <h1 className="text-lg font-semibold">More</h1>
      <div className="mt-4 space-y-3">
        <Link href="/categories" className="block">
          <Card className="flex items-center justify-between">
            <span className="font-medium">Categories</span>
            <span aria-hidden className="text-ink-muted">›</span>
          </Card>
        </Link>
      </div>
    </section>
  );
}
