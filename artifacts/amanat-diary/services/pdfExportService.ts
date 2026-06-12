import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Share } from "react-native";

import { getDiaryTheme } from "@/constants/diaryThemes";
import { getPageBackground, getPageFont, getTextStyle } from "@/constants/pageCustomization";
import { datedFileName } from "@/services/backupService";
import type { Diary, Entry } from "@/types";

const escapeHtml = (value?: string | number) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "diary";
const formatDate = (value: string) => new Date(value).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function pageHtml(entry: Entry, diary: Diary) {
  const theme = getDiaryTheme(entry.themeId);
  const background = getPageBackground(entry.backgroundKey);
  const font = getPageFont(entry.fontKey);
  const textStyle = getTextStyle(entry.textStyleKey);
  const paper = entry.backgroundKey && entry.backgroundKey !== "theme" ? background.paper : theme.paperColor;
  const accent = entry.backgroundKey && entry.backgroundKey !== "theme" ? background.accent : theme.accentColor;
  const tags = entry.tags?.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join("") ?? "";
  const stickers = entry.stickers?.length ? `<div class="stickers">${entry.stickers.map(() => `<span>✦</span>`).join("")}</div>` : "";
  const media = entry.photos?.length ? `<div class="media">${entry.photos.map((_, index) => `Decorated photo attachment ${index + 1}`).join(" · ")} · ${escapeHtml(entry.photoFrameKey ?? "rounded")} frame</div>` : "";
  const cssFont = font.body === "serif" ? "Georgia, serif" : font.body === "cursive" ? "cursive" : "Arial, sans-serif";
  return `<section class="page" style="background:${paper};border-color:${accent};font-family:${cssFont}">
    <header><div><b>${escapeHtml(diary.title)}</b><small>${escapeHtml(formatDate(entry.date))}</small></div><span>Page ${entry.pageNumber}</span></header>
    <div class="eyebrow">${escapeHtml(entry.mood)} · ${escapeHtml(theme.name)}</div>
    <h1>${escapeHtml(entry.title || "Untitled page")}</h1>
    <div class="body" style="font-size:${textStyle.size}px;line-height:${textStyle.lineHeight / textStyle.size};text-align:${textStyle.align}">${escapeHtml(entry.bodyPolished || entry.body || entry.voiceTranscript || "A quiet page.").replaceAll("\n", "<br>")}</div>
    ${entry.hasVoice ? `<aside><b>Original voice memory</b><br>Voice recording attached.${entry.voiceTranscript ? `<br><br><b>Transcript</b><br>${escapeHtml(entry.voiceTranscript).replaceAll("\n", "<br>")}` : ""}</aside>` : ""}
    ${stickers}${media}<footer>${tags}</footer>
  </section>`;
}

function styles() {
  return `<style>
    @page { margin: 0; size: A4; } * { box-sizing: border-box; }
    body { margin: 0; color: #493b30; background: #fbf6ec; font-family: Georgia, serif; }
    .page,.cover,.final,.toc { min-height: 100vh; padding: 62px 68px; page-break-after: always; background: #fffaf0; border: 14px solid #eadbc5; }
    header { display:flex; justify-content:space-between; padding-bottom:18px; border-bottom:1px solid #c7a982; color:#8a6847; }
    header small { display:block; margin-top:6px; font-size:11px; } .eyebrow { margin-top:38px; color:#a47d55; text-transform:uppercase; font-size:10px; letter-spacing:2px; }
    h1 { font-size:30px; line-height:1.25; margin:16px 0 28px; } .body { font-size:16px; line-height:1.9; white-space:normal; }
    footer { margin-top:42px; border-top:1px solid #dfccb2; padding-top:16px; } .tag { display:inline-block; margin:0 8px 8px 0; color:#8a6847; font-size:11px; }
    aside,.media { margin-top:28px; padding:16px; background:#f5ead9; border-left:3px solid #b89169; font-size:12px; line-height:1.7; }
    .stickers { display:flex; gap:10px; margin-top:24px; font-size:24px; }
    .cover,.final { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    .cover h1 { font-size:44px; margin-bottom:10px; }.cover p { color:#8a6847; line-height:1.8; }.rule { width:80px; height:1px; background:#b89169; margin:22px; }
    .toc h1 { margin-bottom:36px; }.toc-row { display:flex; gap:16px; padding:11px 0; border-bottom:1px solid #eadbc5; font-size:12px; }.toc-row b { width:48px;color:#a47d55; }.toc-row span { flex:1; }
  </style>`;
}

function documentHtml(diary: Diary, entries: Entry[], book: boolean) {
  const sorted = [...entries].sort((a, b) => a.pageNumber - b.pageNumber);
  const dates = sorted.map(entry => new Date(entry.date).getTime()).filter(Number.isFinite);
  const range = dates.length ? `${new Date(Math.min(...dates)).toLocaleDateString()} – ${new Date(Math.max(...dates)).toLocaleDateString()}` : "A new beginning";
  const cover = book ? `<section class="cover"><div>A LIFE BOOK</div><div class="rule"></div><h1>${escapeHtml(diary.title)}</h1><p>${escapeHtml(diary.subtitle || diary.category)}<br>${sorted.length} pages<br>${escapeHtml(range)}</p></section>` : "";
  const toc = book && sorted.length > 1 ? `<section class="toc"><h1>Contents</h1>${sorted.map(entry => `<div class="toc-row"><b>${entry.pageNumber}</b><span>${escapeHtml(entry.title || "Untitled page")}</span><i>${escapeHtml(new Date(entry.date).toLocaleDateString())}</i></div>`).join("")}</section>` : "";
  const final = book ? `<section class="final"><div class="rule"></div><h1>Your memories, safely kept.</h1><p>Amanat Diary</p></section>` : "";
  return `<!doctype html><html><head><meta charset="utf-8">${styles()}</head><body>${cover}${toc}${sorted.map(entry => pageHtml(entry, diary)).join("")}${final}</body></html>`;
}

export async function exportEntriesPdf(diary: Diary, entries: Entry[], book = false) {
  if (!entries.length) throw new Error("There are no pages to export.");
  if (Platform.OS === "web") throw new Error("PDF export is available in the iOS and Android app.");
  const { uri } = await Print.printToFileAsync({ html: documentHtml(diary, entries, book), base64: false });
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
