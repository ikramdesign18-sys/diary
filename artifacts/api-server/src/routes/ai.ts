import { Router, type IRouter, type Response } from "express";
import multer from "multer";

import { detectTheme, polishVoice } from "../services/aiEndpoints";
import { AiServiceError, requestGroqTranscription } from "../services/groqClient";
import { ValidationError } from "../utils/validateAiRequest";

const router: IRouter = Router();
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 24 * 1024 * 1024, files: 1 },
});
const supportedAudio = /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i;
const transcriptionLanguages = new Set(["auto", "en", "ur", "hi", "roman-ur"]);

function handleError(error: unknown, res: Response) {
  if (error instanceof ValidationError) return res.status(error.status).json({ error: error.message, fallbackAllowed: true });
  if (error instanceof AiServiceError) return res.status(error.status).json({ error: error.message, fallbackAllowed: error.fallbackAllowed });
  return res.status(500).json({ error: "AI request failed safely", fallbackAllowed: true });
}

router.post("/ai/theme-detect", async (req, res) => {
  try {
    return res.json(await detectTheme(req.body));
  } catch (error) {
    return handleError(error, res);
  }
});

router.post("/ai/voice-polish", async (req, res) => {
  try {
    return res.json(await polishVoice(req.body));
  } catch (error) {
    return handleError(error, res);
  }
});

router.post("/ai/transcribe-audio", audioUpload.single("audio"), async (req, res) => {
  try {
    if (!req.file || !supportedAudio.test(req.file.originalname)) throw new AiServiceError("A supported audio file is required", 400);
    const language = typeof req.body.language === "string" && transcriptionLanguages.has(req.body.language) ? req.body.language : "auto";
    return res.json(await requestGroqTranscription(req.file, language));
  } catch (error) {
    return handleError(error, res);
  }
});

export default router;
