"use client";

import { useSocket } from "@/context/SocketContext";
import VideoContainer from "./VideoContainer";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff } from "react-icons/md";

const VideoCall = () => {
  const { localStream } = useSocket();
  const [isMicOn, setMicOn] = useState(true);
  const [isVidOn, setVidOn] = useState(true);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      setVidOn(videoTrack.enabled);

      const audioTrack = localStream.getAudioTracks()[0];
      setMicOn(audioTrack.enabled);
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVidOn(videoTrack.enabled);
    }
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  }, [localStream]);

  return (
    <div>
      <div>
        {localStream && (
          <VideoContainer
            stream={localStream}
            isLocalStream={true}
            isOnCall={false}
          />
        )}
      </div>

      <div>
        {localStream && (
          <div className="mt-8 flex items-center justify-center">
            <button onClick={toggleMic}>
              {isMicOn && <MdMicOff size={28} />}
              {!isMicOn && <MdMic size={28} />}
            </button>

            <button
              className="px-4 py-2 bg-rose-500 text-white rounded mx-4"
              onClick={() => {}}
            >
              End Call
            </button>

            <button onClick={toggleCamera}>
              {isVidOn && <MdVideocamOff size={28} />}
              {!isVidOn && <MdVideocam size={28} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
