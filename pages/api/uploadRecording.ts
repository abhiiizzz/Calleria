import type { NextApiRequest, NextApiResponse } from "next";
import * as nc from "next-connect"; // import as namespace
import multer from "multer";
import { recordingQueue } from "@/lib/bullmq";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";

// Define a helper type for next-connect's factory function.
type NextConnectFn = <Req = NextApiRequest, Res = NextApiResponse>() => {
  use: (
    ...handlers: Array<(req: Req, res: Res, next: () => void) => any>
  ) => any;
  post: (...handlers: Array<(req: Req, res: Res) => any>) => any;
};

// Convert our imported module to our helper type.
// (We try to get the default export if it exists; otherwise, use the namespace.)
const nextConnectFn = ((nc as any).default || nc) as NextConnectFn;

// Create the handler using our generic helper type.
const handler = nextConnectFn<NextApiRequest, NextApiResponse>();

// Configure multer to store files in the 'uploads' folder.
const upload = multer({ dest: "./uploads" });

// Wrap the multer middleware (with casting to Express types).
handler.use((req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  upload.single("video")(
    req as unknown as ExpressRequest,
    res as unknown as ExpressResponse,
    next
  );
});

handler.post(async (req: NextApiRequest, res: NextApiResponse) => {
  // Multer adds the "file" property.
  // @ts-ignore
  const filePath: string | undefined = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  console.log("API: Received uploaded recording at", filePath);

  // Enqueue a BullMQ job with the file path.
  const job = await recordingQueue.add("processRecording", { filePath });

  res.status(200).json({
    message: "Recording uploaded, processing started.",
    jobId: job.id,
  });
});

export const config = {
  api: {
    bodyParser: false, // Disable Next.js built-in body parser for multer.
  },
};

export default handler;
