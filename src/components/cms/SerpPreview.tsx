interface Props {
  title: string;
  slug: string;
  description: string;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

export default function SerpPreview({ title, slug, description }: Props) {
  const previewTitle = truncate(title || "Untitled song", 60);
  const previewDescription = truncate(description || "No description yet.", 160);
  const url = `https://music.example.com/songs/${slug || "new-song"}`;

  return (
    <article className="glass-card p-4">
      <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">Google SERP preview</p>
      <p className="text-lg font-medium text-[#8ab4f8]">{previewTitle}</p>
      <p className="mb-2 text-sm text-[#9aa0a6]">{url}</p>
      <p className="text-sm text-[#bdc1c6]">{previewDescription}</p>
    </article>
  );
}
