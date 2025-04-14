// /workers/recordingWorker.ts
import { Worker } from "bullmq";
import ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import * as fs from "fs";
// Ensure that the output directory "processed" exists.
const outputDir = path.join(process.cwd(), "processed");
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}
const worker = new Worker("recording-processing", async (job) => {
    const { filePath } = job.data;
    const outputFileName = `${Date.now()}-processed.mp4`;
    const outputPath = path.join(outputDir, outputFileName);
    console.log("Worker: Processing file", filePath);
    return new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .outputOptions("-c:v libx264", "-preset fast", "-c:a aac")
            .output(outputPath)
            .on("end", () => {
            console.log("Worker: Processing complete, output:", outputPath);
            // Delete the temporary file.
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Worker: Error deleting temp file", err);
                }
            });
            resolve({ outputPath });
        })
            .on("error", (err) => {
            console.error("Worker: Error during processing:", err);
            reject(err);
        })
            .run();
    });
}, {
    connection: {
        host: "localhost",
        port: 6379,
    },
});
worker.on("completed", (job, returnValue) => {
    console.log(`Worker: Job ${job.id} completed, output:`, returnValue);
    // Optionally notify the client via Socket.IO here.
});
worker.on("failed", (job, err, prev) => {
    console.error(`Worker: Job ${job ? job.id : "unknown"} failed with error:`, err, "Previous error:", prev);
});
export default worker;
