"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// /workers/recordingWorker.ts
const bullmq_1 = require("bullmq");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Ensure the output directory exists.
const outputDir = path_1.default.join(process.cwd(), "processed");
if (!fs_1.default.existsSync(outputDir)) {
    fs_1.default.mkdirSync(outputDir);
}
const worker = new bullmq_1.Worker("recording-processing", async (job) => {
    const { filePath } = job.data;
    const outputFileName = `${Date.now()}-processed.mp4`;
    const outputPath = path_1.default.join(outputDir, outputFileName);
    console.log("Worker: Processing file", filePath);
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(filePath)
            .outputOptions("-c:v libx264", "-preset fast", "-c:a aac")
            .output(outputPath)
            .on("end", () => {
            console.log("Worker: Processing complete, output:", outputPath);
            // Clean up temporary file.
            fs_1.default.unlink(filePath, (err) => {
                if (err)
                    console.error("Worker: Error deleting temp file", err);
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
    console.log(`Worker: Job ${job === null || job === void 0 ? void 0 : job.id} completed, output:`, returnValue);
    // Optionally, you can notify the client via socket here.
});
worker.on("failed", (job, err) => {
    console.error(`Worker: Job ${job === null || job === void 0 ? void 0 : job.id} failed with error:`, err);
});
exports.default = worker;
