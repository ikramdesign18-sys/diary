import { Router, type IRouter, type Response } from "express";

import { detectTheme, polishVoice } from "../services/aiEndpoints";
import { AiServiceError } from "../services/groqClient";
import { ValidationError } from "../utils/validateAiRequest";

const router: IRouter = Router();

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

router.post("/ai/transcribe-audio", (_req, res) => {
  return res.status(501).json({ error: "Audio transcription backend is not configured yet", fallbackAllowed: true });
});

export default router;
