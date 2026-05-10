export interface SeoValidationInput {
  title: string;
  description: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  noindex?: boolean;
  keywords?: Array<{ keyword: string; isPrimary?: boolean }>;
}

export interface SeoIssue {
  field: string;
  level: "error" | "warning";
  message: string;
}

export interface SeoValidationResult {
  score: number;
  density: number;
  issues: SeoIssue[];
}

function keywordDensity(text: string, keyword: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) {
    return 0;
  }
  const words = normalizedText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }
  const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "g");
  const matches = normalizedText.match(regex);
  const count = matches?.length ?? 0;
  return (count / words.length) * 100;
}

export function validateSeo(input: SeoValidationInput): SeoValidationResult {
  const issues: SeoIssue[] = [];
  let score = 100;

  const effectiveTitle = input.metaTitle?.trim() || input.title.trim();
  const effectiveDescription = input.metaDescription?.trim() || input.description.trim();

  if (effectiveTitle.length > 60 || effectiveTitle.length < 30) {
    issues.push({ field: "title", level: "warning", message: "Title should be between 30 and 60 chars." });
    score -= 12;
  }
  if (effectiveDescription.length > 160 || effectiveDescription.length < 140) {
    issues.push({ field: "description", level: "warning", message: "Meta description should be 140-160 chars." });
    score -= 10;
  }
  if (input.description.trim().length < 150) {
    issues.push({ field: "description", level: "error", message: "Description must have at least 150 chars." });
    score -= 25;
  }

  const primaryKeyword = input.keywords?.find((k) => k.isPrimary)?.keyword || input.keywords?.[0]?.keyword;
  let density = 0;
  if (primaryKeyword) {
    density = keywordDensity(`${input.title} ${input.description}`, primaryKeyword);
    const hasInTitle = input.title.toLowerCase().includes(primaryKeyword.toLowerCase());
    const hasInSlug = input.slug.toLowerCase().includes(primaryKeyword.toLowerCase().replace(/\s+/g, "-"));

    if (!hasInTitle) {
      issues.push({ field: "title", level: "warning", message: "Primary keyword should appear in title." });
      score -= 8;
    }
    if (!hasInSlug) {
      issues.push({ field: "slug", level: "warning", message: "Primary keyword should appear in slug." });
      score -= 7;
    }
    if (density < 0.5 || density > 3.0) {
      issues.push({ field: "keywords", level: "warning", message: "Keyword density should stay between 0.5% and 3%." });
      score -= 10;
    }
  }

  if (input.noindex) {
    issues.push({ field: "noindex", level: "warning", message: "Noindex enabled. Page will not rank." });
    score -= 5;
  }

  if (input.canonicalUrl) {
    try {
      new URL(input.canonicalUrl);
    } catch {
      issues.push({ field: "canonicalUrl", level: "error", message: "Canonical URL is invalid." });
      score -= 12;
    }
  }

  if (!input.ogImageUrl) {
    issues.push({ field: "ogImage", level: "warning", message: "OG image is recommended." });
    score -= 6;
  }

  return {
    score: Math.max(0, score),
    density,
    issues
  };
}
