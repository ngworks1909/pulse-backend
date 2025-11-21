import { runScheduler } from "./cron";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await runScheduler();
    res.status(200).end();
  } catch (err: any) {
    console.error("Cron error:", err);
    res.status(500).end();
  }
}
