// /workers/recordingWorker.ts
import { Worker, type Job } from "bullmq";
import ffmpeg from "fluent-ffmpeg";
import * as path from "path";
import * as fs from "fs";

// Ensure that the output directory "processed" exists.
const outputDir = path.join(process.cwd(), "processed");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Define a type for the job data.
type ProcessJobData = {
  filePath: string;
};

const worker = new Worker<ProcessJobData>(
  "recording-processing",
  async (job: Job<ProcessJobData>): Promise<{ outputPath: string }> => {
    const { filePath } = job.data;
    const outputFileName = `${Date.now()}-processed.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    console.log("Worker: Processing file", filePath);

    return new Promise<{ outputPath: string }>((resolve, reject) => {
      ffmpeg(filePath)
        .outputOptions("-c:v libx264", "-preset fast", "-c:a aac")
        .output(outputPath)
        .on("end", () => {
          console.log("Worker: Processing complete, output:", outputPath);
          // Delete the temporary file.
          fs.unlink(filePath, (err: Error | null) => {
            if (err) {
              console.error("Worker: Error deleting temp file", err);
            }
          });
          resolve({ outputPath });
        })
        .on("error", (err: Error) => {
          console.error("Worker: Error during processing:", err);
          reject(err);
        })
        .run();
    });
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

worker.on(
  "completed",
  (job: Job<ProcessJobData>, returnValue: { outputPath: string }) => {
    console.log(`Worker: Job ${job.id} completed, output:`, returnValue);
    // Optionally notify the client via Socket.IO here.
  }
);

worker.on(
  "failed",
  (job: Job<ProcessJobData> | undefined, err: Error, prev: string) => {
    console.error(
      `Worker: Job ${job ? job.id : "unknown"} failed with error:`,
      err,
      "Previous error:",
      prev
    );
  }
);

export default worker;
