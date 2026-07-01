"use client";

/**
 * F5 — Report. PARKED (per the architect's call on 2026-07-01).
 *
 * Planned: spend-by-category breakdown + spend-vs-budget for the current period,
 * with a prior-period view. Charting library still undecided (project-spec Gap #5:
 * Recharts vs Chart.js vs lightweight) — settle that before building this out.
 *
 * The data it needs already exists: useExpenses(periodId) gives per-period
 * expenses + total, and categories resolve (including archived ones) by id.
 */
export default function ReportPage() {
  return (
    <section className="pt-16 text-center">
      <h1 className="text-lg font-semibold">Report</h1>
      <p className="mt-2 text-sm text-slate-500">
        Parked for now. Spend-by-category and spend-vs-budget land here once the
        input routine has stuck.
      </p>
    </section>
  );
}
