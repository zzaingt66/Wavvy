import type { SeoValidationResult } from "../../lib/cms/seo";

interface Props {
  result: SeoValidationResult;
}

function colorForScore(score: number): string {
  if (score >= 85) {
    return "text-emerald-300";
  }
  if (score >= 70) {
    return "text-amber-300";
  }
  return "text-rose-300";
}

export default function SeoRealtimePanel({ result }: Props) {
  return (
    <article className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">SEO validation</p>
        <p className={`text-xl font-semibold ${colorForScore(result.score)}`}>{result.score}/100</p>
      </div>
      <p className="mb-3 text-sm text-slate-300">Keyword density: {result.density.toFixed(2)}%</p>
      <ul className="space-y-2 text-sm">
        {result.issues.length === 0 ? (
          <li className="text-emerald-300">No critical SEO issues found.</li>
        ) : (
          result.issues.map((issue, index) => (
            <li key={index} className={issue.level === "error" ? "text-rose-300" : "text-amber-300"}>
              {issue.field}: {issue.message}
            </li>
          ))
        )}
      </ul>
    </article>
  );
}
