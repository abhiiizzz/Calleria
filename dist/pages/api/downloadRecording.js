import path from "path";
import fs from "fs";
export default function handler(req, res) {
    const { file } = req.query; // e.g. ?file=1623456789123-processed.mp4
    if (!file || typeof file !== "string") {
        return res.status(400).json({ error: "Missing or invalid file parameter" });
    }
    const filePath = path.join(process.cwd(), "processed", file);
    if (fs.existsSync(filePath)) {
        res.setHeader("Content-Disposition", `attachment; filename=${file}`);
        res.setHeader("Content-Type", "video/mp4");
        fs.createReadStream(filePath).pipe(res);
    }
    else {
        res.status(404).json({ error: "File not found" });
    }
}
