import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Share } from "react-native";

import { getDiaryTheme } from "@/constants/diaryThemes";
import { getPageBackground, getPageFont, getTextStyle } from "@/constants/pageCustomization";
import { getVectorAsset } from "@/constants/vectorAssetRegistry";
import { datedFileName } from "@/services/backupService";
import type { Diary, Entry, PageSticker } from "@/types";

const escapeHtml = (value?: string | number) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "diary";
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const formatTime = (value: string) => new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

const mimeForUri = (uri: string) => {
  const extension = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
};

async function photoHtml(uri: string, index: number) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) throw new Error("Photo file is missing");
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return `<figure class="photo"><img src="data:${mimeForUri(uri)};base64,${base64}" alt="Attached diary image ${index + 1}"><figcaption>Attached memory ${index + 1}</figcaption></figure>`;
  } catch {
    return `<div class="photo-fallback">Attached image could not be included in this PDF.</div>`;
  }
}

function stickerMotif(category: string, color: string, accent: string) {
  if (category === "love") return `<path d="M32 53C13 39 12 19 25 15c8-3 13 2 16 8 4-6 9-11 17-8 13 4 12 24-7 38l-10 8z" fill="${accent}" stroke="${color}" stroke-width="3"/>`;
  if (category === "birthday") return `<rect x="18" y="32" width="46" height="28" rx="6" fill="${accent}" stroke="${color}" stroke-width="3"/><path d="M18 43c8 7 15-7 23 0s15-7 23 0" fill="none" stroke="#fff9f0" stroke-width="3"/><path d="M41 31V18" stroke="${color}" stroke-width="3"/>`;
  if (category === "family") return `<path d="M13 39 41 15l28 24v28H13z" fill="${accent}" stroke="${color}" stroke-width="3"/><path d="M31 66V48h20v18" fill="#fff9f0" stroke="${color}" stroke-width="3"/>`;
  if (category === "travel") return `<path d="m12 43 57-22-18 22 13 12-8 5-17-10-12 15-5-3 6-19-16 4z" fill="${accent}" stroke="${color}" stroke-width="3"/>`;
  if (category === "mood") return `<circle cx="41" cy="41" r="27" fill="${accent}" stroke="${color}" stroke-width="3"/><circle cx="32" cy="36" r="3" fill="${color}"/><circle cx="50" cy="36" r="3" fill="${color}"/><path d="M29 49c7 7 17 7 24 0" fill="none" stroke="${color}" stroke-width="3"/>`;
  if (category === "nature") return `<path d="M42 68C28 51 28 27 43 12c15 16 14 40-1 56z" fill="${accent}" stroke="${color}" stroke-width="3"/><path d="M42 64V22M42 43l13-10M42 51 29 39" fill="none" stroke="${color}" stroke-width="2.5"/>`;
  if (category === "gratitude") return `<path d="M41 65c-18-8-22-24-9-32 2-14 16-18 23-7 14 1 18 16 8 24-3 10-12 16-22 15z" fill="${accent}" stroke="${color}" stroke-width="3"/><circle cx="42" cy="41" r="7" fill="#fff9f0"/>`;
  if (category === "study") return `<rect x="15" y="18" width="52" height="47" rx="7" fill="${accent}" stroke="${color}" stroke-width="3"/><path d="M27 18v47M36 31h20M36 41h20M36 51h14" stroke="${color}" stroke-width="3"/>`;
  if (category === "memory") return `<rect x="17" y="21" width="48" height="43" rx="5" fill="${accent}" stroke="${color}" stroke-width="3"/><circle cx="41" cy="42" r="10" fill="#fff9f0" stroke="${color}" stroke-width="3"/>`;
  return `<path d="m41 12 6 20 20-6-15 15 15 15-20-6-6 20-6-20-20 6 15-15-15-15 20 6z" fill="${accent}" stroke="${color}" stroke-width="2.5"/>`;
}

function stickerHtml(sticker: PageSticker) {
  const assetId = sticker.assetId ?? sticker.id;
  const asset = getVectorAsset(assetId);
  const name = asset?.name ?? sticker.category ?? "Diary decoration";
  const category = assetId.split("-")[0];
  const color = asset?.defaultColors.color ?? "#765A45";
  const accent = asset?.defaultColors.accent ?? "#E7C9B1";
  const width = Math.max(44, Math.min(sticker.width ?? 70, 160));
  const rotation = Number.isFinite(sticker.rotation) ? sticker.rotation : 0;
  return `<figure class="sticker" style="width:${width}px;transform:rotate(${rotation}deg)">
    <svg viewBox="0 0 82 82" role="img" aria-label="${escapeHtml(name)}">${stickerMotif(category, color, accent)}</svg>
    <figcaption>${escapeHtml(name)}</figcaption>
  </figure>`;
}

async function pageHtml(entry: Entry, diary: Diary) {
  const theme = getDiaryTheme(entry.themeId);
  const background = getPageBackground(entry.backgroundKey);
  const font = getPageFont(entry.fontKey);
  const textStyle = getTextStyle(entry.textStyleKey);
  const paper = entry.backgroundKey && entry.backgroundKey !== "theme" ? background.paper : theme.paperColor;
  const accent = entry.backgroundKey && entry.backgroundKey !== "theme" ? background.accent : theme.accentColor;
  const tags = entry.tags?.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join("") ?? "";
  const stickers = entry.stickers?.length ? `<div class="stickers">${entry.stickers.map(stickerHtml).join("")}</div>` : "";
  const photos = entry.photos?.length ? `<div class="photos">${(await Promise.all(entry.photos.map(photoHtml))).join("")}</div>` : "";
  const cssFont = font.body === "serif" ? "Georgia, serif" : font.body === "cursive" ? "cursive" : "Arial, sans-serif";
  const voiceTranscript = entry.voiceTranscript && entry.voiceTranscript !== entry.body && entry.voiceTranscript !== entry.bodyPolished
    ? `<div class="transcript"><b>Voice transcript</b><br>${escapeHtml(entry.voiceTranscript).replaceAll("\n", "<br>")}</div>`
    : "";
  return `<section class="page" style="background:${paper};border-color:${accent};font-family:${cssFont}">
    <header><div><b>${escapeHtml(diary.title)}</b><small>${escapeHtml(formatDate(entry.date))} · ${escapeHtml(formatTime(entry.createdAt))}</small></div><span>Page ${entry.pageNumber}</span></header>
    <div class="eyebrow">${escapeHtml(entry.mood)} · ${escapeHtml(theme.name)}</div>
    <h1>${escapeHtml(entry.title || "Untitled page")}</h1>
    <div class="body" style="font-size:${textStyle.size}px;line-height:${textStyle.lineHeight / textStyle.size};text-align:${textStyle.align}">${escapeHtml(entry.bodyPolished || entry.body || entry.voiceTranscript || "A quiet page.").replaceAll("\n", "<br>")}</div>
    ${entry.hasVoice ? `<aside><b>Original voice memory</b><br>Voice recording attached.</aside>${voiceTranscript}` : ""}
    ${stickers}${photos}<footer>${tags}</footer>
  </section>`;
}

function styles() {
  return `<style>
    @page { margin: 0; size: A4; } * { box-sizing: border-box; }
    body { margin: 0; color: #493b30; background: #fbf6ec; font-family: Georgia, serif; }
    .page,.cover,.final,.toc { min-height: 100vh; padding: 62px 68px; page-break-after: always; background: #fffaf0; border: 14px solid #eadbc5; }
    header { display:flex; justify-content:space-between; padding-bottom:18px; border-bottom:1px solid #c7a982; color:#8a6847; }
    header small { display:block; margin-top:6px; font-size:11px; } .eyebrow { margin-top:38px; color:#a47d55; text-transform:uppercase; font-size:10px; letter-spacing:2px; }
    h1 { font-size:30px; line-height:1.25; margin:16px 0 28px; } .body { font-size:16px; line-height:1.9; white-space:normal; overflow-wrap:anywhere; }
    footer { margin-top:42px; border-top:1px solid #dfccb2; padding-top:16px; } .tag { display:inline-block; margin:0 8px 8px 0; color:#8a6847; font-size:11px; }
    aside,.transcript { margin-top:28px; padding:16px; background:#f5ead9; border-left:3px solid #b89169; font-size:12px; line-height:1.7; break-inside:avoid; }
    .stickers { display:flex; flex-wrap:wrap; align-items:flex-end; gap:18px; margin-top:28px; padding:18px; border:1px solid #eadbc5; border-radius:14px; break-inside:avoid; }
    .sticker { margin:0; text-align:center; break-inside:avoid; }.sticker svg { display:block; width:100%; height:auto; }.sticker figcaption { margin-top:4px; color:#8a6847; font-size:8px; transform:none; }
    .photos { display:grid; gap:20px; margin-top:28px; }.photo { margin:0; padding:10px 10px 28px; background:#fffdf9; border:1px solid #dfccb2; border-radius:8px; break-inside:avoid; page-break-inside:avoid; }
    .photo img { display:block; width:100%; max-height:560px; object-fit:contain; border-radius:5px; }.photo figcaption { margin-top:10px; color:#8a6847; font-size:10px; text-align:center; }
    .photo-fallback { margin-top:20px; padding:18px; color:#8a6847; background:#f5ead9; border:1px dashed #c7a982; border-radius:8px; break-inside:avoid; }
    .cover,.final { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    .cover h1 { font-size:44px; margin-bottom:10px; }.cover p { color:#8a6847; line-height:1.8; }.rule { width:80px; height:1px; background:#b89169; margin:22px; }
    .toc h1 { margin-bottom:36px; }.toc-row { display:flex; gap:16px; padding:11px 0; border-bottom:1px solid #eadbc5; font-size:12px; break-inside:avoid; }.toc-row b { width:48px;color:#a47d55; }.toc-row span { flex:1; }
  </style>`;
}

async function documentHtml(diary: Diary, entries: Entry[], book: boolean) {
  const sorted = [...entries].sort((a, b) => a.pageNumber - b.pageNumber);
  const dates = sorted.map(entry => new Date(entry.date).getTime()).filter(Number.isFinite);
  const range = dates.length ? `${new Date(Math.min(...dates)).toLocaleDateString()} – ${new Date(Math.max(...dates)).toLocaleDateString()}` : "A new beginning";
  const cover = book ? `<section class="cover"><div>A LIFE BOOK</div><div class="rule"></div><h1>${escapeHtml(diary.title)}</h1><p>${escapeHtml(diary.subtitle || diary.category)}<br>${sorted.length} pages<br>${escapeHtml(range)}</p></section>` : "";
  const toc = book && sorted.length > 1 ? `<section class="toc"><h1>Contents</h1>${sorted.map(entry => `<div class="toc-row"><b>${entry.pageNumber}</b><span>${escapeHtml(entry.title || "Untitled page")}</span><i>${escapeHtml(new Date(entry.date).toLocaleDateString())}</i></div>`).join("")}</section>` : "";
  const final = book ? `<section class="final"><div class="rule"></div><h1>Your memories, safely kept.</h1><p>Amanat Diary</p></section>` : "";
  return `<!doctype html><html><head><meta charset="utf-8">${styles()}</head><body>${cover}${toc}${(await Promise.all(sorted.map(entry => pageHtml(entry, diary)))).join("")}${final}</body></html>`;
}

export async function exportEntriesPdf(diary: Diary, entries: Entry[], book = false) {
  if (!entries.length) throw new Error("There are no pages to export.");
  if (Platform.OS === "web") throw new Error("PDF export is available in the iOS and Android app.");
  const { uri } = await Print.printToFileAsync({ html: await documentHtml(diary, entries, book), base64: false });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  const fileName = book ? datedFileName(`${slug(diary.title)}-book`, "pdf") : datedFileName(`diary-page-${entries[0].pageNumber}`, "pdf");
  const savedUri = `${FileSystem.documentDirectory}${fileName}`;
  const existing = await FileSystem.getInfoAsync(savedUri);
  if (existing.exists) await FileSystem.deleteAsync(savedUri, { idempotent: true });
  await FileSystem.copyAsync({ from: uri, to: savedUri });
  await Sharing.shareAsync(savedUri, { mimeType: "application/pdf", dialogTitle: fileName, UTI: "com.adobe.pdf" });
  return fileName;
}

export async function shareEntriesText(diary: Diary, entries: Entry[]) {
  const message = entries.sort((a, b) => a.pageNumber - b.pageNumber).map(entry =>
    `${diary.title}\nPage ${entry.pageNumber} · ${formatDate(entry.date)} · ${entry.mood}\n\n${entry.title}\n\n${entry.bodyPolished || entry.body || entry.voiceTranscript || "A quiet page."}${entry.hasVoice ? "\n\nOriginal voice recording attached." : ""}`,
  ).join("\n\n──────────\n\n");
  await Share.share({ title: `${diary.title} selected pages`, message });
}
