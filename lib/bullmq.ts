// /lib/bullmq.ts
import { Queue } from "bullmq";

export const recordingQueue = new Queue("recording-processing", {
  connection: {
    host: "localhost", // adjust accordingly
    port: 6379, // default Redis port
  },
});
