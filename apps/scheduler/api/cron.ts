import { VercelRequest, VercelResponse } from "@vercel/node";
import { runScheduler } from "../src/run-scheduler";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    await runScheduler();
    return res.status(200).json({ message: "Scheduler run completed" });
}