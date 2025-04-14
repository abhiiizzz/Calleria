// /components/Recorder.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
const Recorder = () => {
    const { localStream, peer } = useSocket();
    const [recording, setRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const mediaRecorderRef = useRef(null);
    const [downloadMessage, setDownloadMessage] = useState(null);
    // Combine local and remote tracks into one MediaStream.
    const getCombinedStream = () => {
        const combinedStream = new MediaStream();
        if (localStream) {
            localStream
                .getTracks()
                .forEach((track) => combinedStream.addTrack(track));
        }
        if (peer && peer.remoteStream) {
            peer.remoteStream
                .getTracks()
                .forEach((track) => combinedStream.addTrack(track));
        }
        return combinedStream;
    };
    const startRecording = () => {
        const combinedStream = getCombinedStream();
        if (!combinedStream)
            return;
        const options = { mimeType: "video/webm; codecs=vp9" };
        try {
            const mediaRecorder = new MediaRecorder(combinedStream, options);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    setRecordedChunks((prev) => [...prev, event.data]);
                }
            };
            mediaRecorder.start(1000); // collect data every 1 second
            setRecording(true);
            console.log("Recording started");
        }
        catch (e) {
            console.error("Error starting recording", e);
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            console.log("Recording stopped");
            setDownloadMessage("Kindly wait until we let you download your recording");
        }
    };
    // When recording stops, upload the Blob to our server.
    useEffect(() => {
        if (!recording && recordedChunks.length > 0) {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            setRecordedChunks([]); // clear for next recording
            const formData = new FormData();
            formData.append("video", blob, "recording.webm");
            fetch("/api/uploadRecording", {
                method: "POST",
                body: formData,
            })
                .then((res) => res.json())
                .then((data) => {
                console.log("Upload response:", data);
                // Optionally, once processing is done (via a socket event), update downloadMessage
                // For now, we display the message until the user downloads the file.
            })
                .catch((err) => console.error("Upload error:", err));
        }
    }, [recording, recordedChunks]);
    return (<div>
      {recording ? (<button onClick={stopRecording} className="record-btn stop">
          Stop Recording
        </button>) : (<button onClick={startRecording} className="record-btn start">
          Start Recording
        </button>)}
      {downloadMessage && <p>{downloadMessage}</p>}
    </div>);
};
export default Recorder;
