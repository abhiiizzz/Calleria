import nextConnect from "next-connect";
import multer from "multer";
import { recordingQueue } from "@/lib/bullmq";
// Configure multer to store files in the 'uploads' folder.
const upload = multer({ dest: "./uploads" });
// Create a next-connect handler with the correct types.
const handler = nextConnect();
// Wrap the multer middleware. Cast NextApiRequest/NextApiResponse to Express types.
handler.use((req, res, next) => {
    upload.single("video")(req, res, next);
});
handler.post(async (req, res) => {
    var _a;
    // req.file is added by multer.
    // @ts-ignore
    const filePath = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
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
