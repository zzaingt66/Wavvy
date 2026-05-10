import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { actions } from "astro:actions";

import type { SeoValidationResult } from "../../lib/cms/seo";
import { slugify } from "../../lib/cms/slug";
import { songInputSchema } from "../../schemas/song";
import type { SongEditorData } from "../../actions/songs";
import SerpPreview from "./SerpPreview";
import SeoRealtimePanel from "./SeoRealtimePanel";

interface Props {
  mode: "create" | "edit";
  songId?: string;
  genres: Array<{ id: number; name: string }>;
  initial?: SongEditorData | null;
}

type FormState = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  releaseDate: string;
  genreId: string;
  lyrics: string;
  bpm: string;
  musicalKey: string;
  durationSec: string;
  isrc: string;
  releaseNotes: string;
  technicalCredits: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
  schemaType: "MusicRecording" | "MusicComposition" | "CreativeWork";
  tagsInput: string;
  keywordsInput: string;
  mp3Url: string;
  oggUrl: string;
  bitrateKbps: string;
};

interface ActionError {
  message: string;
}

interface ActionResult<T> {
  data?: T;
  error?: ActionError;
}

const defaultSeoResult: SeoValidationResult = {
  score: 0,
  density: 0,
  issues: [{ field: "seo", level: "warning", message: "Fill title/description for SEO analysis." }]
};

function mapInitial(initial?: SongEditorData | null): FormState {
  return {
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    subtitle: initial?.subtitle ?? "",
    description: initial?.description ?? "",
    releaseDate: initial?.releaseDate ?? new Date().toISOString().slice(0, 10),
    genreId: initial?.genreId ? String(initial.genreId) : "",
    lyrics: initial?.lyrics ?? "",
    bpm: initial?.bpm ? String(initial.bpm) : "",
    musicalKey: initial?.musicalKey ?? "",
    durationSec: initial?.durationSec ? String(initial.durationSec) : "",
    isrc: initial?.isrc ?? "",
    releaseNotes: initial?.releaseNotes ?? "",
    technicalCredits: initial?.technicalCredits ?? "",
    metaTitle: initial?.metaTitle ?? "",
    metaDescription: initial?.metaDescription ?? "",
    ogImageUrl: initial?.ogImageUrl ?? "",
    canonicalUrl: initial?.canonicalUrl ?? "",
    noindex: initial?.noindex ?? false,
    schemaType: initial?.schemaType ?? "MusicRecording",
    tagsInput: initial?.tags.join(", ") ?? "",
    keywordsInput: initial?.keywords.map((item) => item.keyword).join(", ") ?? "",
    mp3Url: initial?.mp3Url ?? "",
    oggUrl: initial?.oggUrl ?? "",
    bitrateKbps: String(initial?.bitrateKbps ?? 320)
  };
}

export default function SongForm({ mode, songId, genres, initial }: Props) {
  const [form, setForm] = useState<FormState>(() => mapInitial(initial));
  const [message, setMessage] = useState<string>("");
  const [seoResult, setSeoResult] = useState<SeoValidationResult>(defaultSeoResult);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!form.slug && form.title) {
      setForm((current) => ({ ...current, slug: slugify(current.title) }));
    }
  }, [form.title, form.slug]);

  const keywords = useMemo(
    () =>
      form.keywordsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((keyword, index) => ({ keyword, isPrimary: index === 0 })),
    [form.keywordsInput]
  );

  useEffect(() => {
    const handle = setTimeout(async () => {
      const response = await actions.validateSeo({
        title: form.title,
        slug: form.slug,
        description: form.description,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        canonicalUrl: form.canonicalUrl,
        ogImageUrl: form.ogImageUrl,
        noindex: form.noindex,
        keywords
      });
      const typed = response as ActionResult<SeoValidationResult>;
      if (typed.data) {
        setSeoResult(typed.data);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [form.title, form.slug, form.description, form.metaTitle, form.metaDescription, form.canonicalUrl, form.ogImageUrl, form.noindex, keywords]);

  useEffect(() => {
    if (mode !== "edit" || !songId) {
      return;
    }
    const timer = setTimeout(async () => {
      const payload = createPayload(form, keywords);
      const result = await actions.autosaveSongDraft({
        songId,
        payload
      });
      const typed = result as ActionResult<{ ok: boolean; savedAt: string }>;
      if (typed.data?.ok) {
        setMessage(`Autosaved at ${new Date(typed.data.savedAt).toLocaleTimeString()}`);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [form, keywords, mode, songId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = createPayload(form, keywords);
      const parsed = songInputSchema.parse(payload);

      if (mode === "create") {
        const result = await actions.createSong(parsed);
        const typed = result as ActionResult<{ songId: string; slug: string }>;
        if (typed.error) {
          throw new Error(typed.error.message);
        }
        setMessage(`Created song with slug ${typed.data?.slug ?? ""}`);
      } else if (songId) {
        const result = await actions.updateSong({ songId, ...parsed });
        const typed = result as ActionResult<{ songId: string; slug: string }>;
        if (typed.error) {
          throw new Error(typed.error.message);
        }
        setMessage("Song updated.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish(now: boolean) {
    if (!songId) {
      setMessage("Save draft before publishing.");
      return;
    }
    const scheduledAt = !now ? new Date(Date.now() + 1000 * 60 * 10).toISOString() : undefined;
    const result = await actions.publishSong({
      songId,
      publishNow: now,
      scheduledAt,
      editor: "editor"
    });
    const typed = result as ActionResult<{ status: string; publishedAt: string | null }>;
    if (typed.error) {
      setMessage(typed.error.message);
      return;
    }
    setMessage(now ? "Song published." : "Song scheduled.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <form className="glass-card space-y-4 p-5" onSubmit={onSave}>
        <h2 className="text-xl font-semibold">{mode === "create" ? "New song" : "Edit song"}</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input value={form.title} onChange={(e) => update("title", e.target.value)} className="field" required maxLength={60} />
          </Field>
          <Field label="Slug">
            <input value={form.slug} onChange={(e) => update("slug", slugify(e.target.value))} className="field" required />
          </Field>
        </div>

        <Field label="Description (SEO)">
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="field min-h-36" required />
        </Field>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Release date">
            <input type="date" value={form.releaseDate} onChange={(e) => update("releaseDate", e.target.value)} className="field" required />
          </Field>
          <Field label="Genre">
            <select value={form.genreId} onChange={(e) => update("genreId", e.target.value)} className="field" required>
              <option value="">Select</option>
              {genres.map((genre) => (
                <option key={genre.id} value={String(genre.id)}>
                  {genre.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Schema type">
            <select value={form.schemaType} onChange={(e) => update("schemaType", e.target.value as FormState["schemaType"])} className="field">
              <option>MusicRecording</option>
              <option>MusicComposition</option>
              <option>CreativeWork</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="MP3 URL">
            <input value={form.mp3Url} onChange={(e) => update("mp3Url", e.target.value)} className="field" />
          </Field>
          <Field label="OGG URL">
            <input value={form.oggUrl} onChange={(e) => update("oggUrl", e.target.value)} className="field" />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Meta title">
            <input value={form.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} className="field" maxLength={60} />
          </Field>
          <Field label="Meta description">
            <input value={form.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} className="field" maxLength={160} />
          </Field>
        </div>

        <Field label="Keywords (comma separated)">
          <input value={form.keywordsInput} onChange={(e) => update("keywordsInput", e.target.value)} className="field" />
        </Field>

        <Field label="Tags / moods (comma separated)">
          <input value={form.tagsInput} onChange={(e) => update("tagsInput", e.target.value)} className="field" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={form.noindex} onChange={(e) => update("noindex", e.target.checked)} />
          Noindex
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded-md bg-cyanv px-4 py-2 font-semibold text-night-950" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" className="rounded-md border border-white/20 px-4 py-2" onClick={() => void onPublish(true)}>
            Publish now
          </button>
          <button type="button" className="rounded-md border border-white/20 px-4 py-2" onClick={() => void onPublish(false)}>
            Schedule +10m
          </button>
        </div>

        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </form>

      <div className="space-y-4">
        <SerpPreview title={form.metaTitle || form.title} slug={form.slug} description={form.metaDescription || form.description} />
        <SeoRealtimePanel result={seoResult} />
      </div>
    </div>
  );
}

function createPayload(form: FormState, keywords: Array<{ keyword: string; isPrimary: boolean }>) {
  return {
    title: form.title,
    slug: form.slug,
    subtitle: optionalString(form.subtitle),
    description: form.description,
    releaseDate: form.releaseDate,
    genreId: Number(form.genreId),
    lyrics: optionalString(form.lyrics),
    bpm: optionalNumber(form.bpm),
    musicalKey: optionalString(form.musicalKey),
    durationSec: optionalNumber(form.durationSec),
    isrc: optionalString(form.isrc)?.toUpperCase(),
    releaseNotes: optionalString(form.releaseNotes),
    technicalCredits: optionalString(form.technicalCredits),
    metaTitle: optionalString(form.metaTitle),
    metaDescription: optionalString(form.metaDescription),
    ogImageUrl: optionalString(form.ogImageUrl),
    canonicalUrl: optionalString(form.canonicalUrl),
    noindex: form.noindex,
    schemaType: form.schemaType,
    tags: splitComma(form.tagsInput),
    contributors: [],
    platformLinks: [],
    keywords,
    mp3Url: optionalString(form.mp3Url),
    oggUrl: optionalString(form.oggUrl),
    bitrateKbps: Number(form.bitrateKbps || 320)
  };
}

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitComma(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
