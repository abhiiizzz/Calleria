"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
import type { SocketUser, OngoingCall, PeerData } from "@/types";

// Extend the context interface to also export pendingOffer.
interface ISocketContext {
  onlineUsers: SocketUser[] | null;
  ongoingCall: OngoingCall | null;
  localStream: MediaStream | null;
  peer: PeerData | null;
  handleCall: (user: SocketUser) => void;
  handleJoinCall: (ongoingCall: OngoingCall) => void;
  handleHangup: (data?: {
    ongoingCall?: OngoingCall;
    isEmitHangup?: boolean;
  }) => void;
  isCallEnded: boolean;
  pendingOffer: RTCSessionDescriptionInit | null;
}

export const SocketContext = createContext<ISocketContext | null>(null);

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<SocketUser[] | null>(null);
  const [ongoingCall, setOngoingCall] = useState<OngoingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  // PeerData holds the RTCPeerConnection, remoteStream, and the other participant’s info.
  const [peer, setPeer] = useState<PeerData | null>(null);
  // pendingOffer will store the incoming SDP offer on the callee side.
  const [pendingOffer, setPendingOffer] =
    useState<RTCSessionDescriptionInit | null>(null);
  const [isCallEnded, setIsCallEnded] = useState<boolean>(false);

  const currentSocketUser = onlineUsers?.find((u) => u.userId === user?.id);

  const getMediaStream = useCallback(
    async (faceMode?: string): Promise<MediaStream | null> => {
      if (localStream) return localStream;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 360, ideal: 720, max: 1080 },
            frameRate: { min: 16, ideal: 30, max: 30 },
            facingMode: videoDevices.length ? faceMode : undefined,
          },
        });
        setLocalStream(stream);
        console.log("Local stream acquired:", stream);
        return stream;
      } catch (error) {
        console.error("Failed to get local stream", error);
        return null;
      }
    },
    [localStream]
  );

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ];
    const pc = new RTCPeerConnection({ iceServers });
    console.log("RTCPeerConnection created", pc);
    return pc;
  }, []);

  // Caller: Initiate the call.
  const handleCall = useCallback(
    async (userToCall: SocketUser) => {
      if (!currentSocketUser || !socket) return;
      setIsCallEnded(false);
      const stream = await getMediaStream();
      if (!stream) return;
      const participants = { caller: currentSocketUser, receiver: userToCall };
      setOngoingCall({ participants, isRinging: false });
      // Emit "call" so the server can relay to the receiver.
      socket.emit("call", participants);
      console.log("Emitted 'call' with participants:", participants);

      const pc = createPeerConnection();
      // Add each local track and (optional) add transceiver on caller side.
      stream.getTracks().forEach((track) => {
        console.log("Caller: Adding local track", track);
        pc.addTrack(track, stream);
        // Optionally, caller can add a transceiver to ensure bidirectional negotiation.
        pc.addTransceiver(track.kind, { direction: "sendrecv" });
      });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Caller ICE candidate:", event.candidate);
          socket.emit("webrtcSignal", {
            sdp: null,
            candidate: event.candidate,
            ongoingCall: { participants, isRinging: false },
            isCaller: true,
          });
        }
      };
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track]);
        console.log("Caller received remote stream:", remoteStream);
        setPeer({
          peerConnection: pc,
          participantUser: userToCall,
          remoteStream,
        });
      };

      try {
        const offer = await pc.createOffer();
        console.log("Caller: Offer created:", offer);
        await pc.setLocalDescription(offer);
        socket.emit("webrtcSignal", {
          sdp: offer,
          candidate: null,
          ongoingCall: { participants, isRinging: false },
          isCaller: true,
        });
        setPeer({
          peerConnection: pc,
          participantUser: userToCall,
          remoteStream: null,
        });
      } catch (error) {
        console.error("Caller: Error during call initiation:", error);
      }
    },
    [socket, currentSocketUser, getMediaStream, createPeerConnection]
  );

  // Callee: Answer an incoming call.
  const handleJoinCall = useCallback(
    async (incomingCall: OngoingCall) => {
      if (!socket) return;
      setIsCallEnded(false);
      // Update state to mark the call as no longer ringing.
      setOngoingCall({ ...incomingCall, isRinging: false });
      const stream = await getMediaStream();
      if (!stream) return;
      const pc = createPeerConnection();
     
      stream.getTracks().forEach((track) => {
        console.log("Callee: Adding local track", track);
        pc.addTrack(track, stream);
      });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Callee ICE candidate:", event.candidate);
          socket.emit("webrtcSignal", {
            sdp: null,
            candidate: event.candidate,
            ongoingCall: incomingCall,
            isCaller: false,
          });
        }
      };
      // Use an updater to combine all incoming tracks into a single MediaStream.
      pc.ontrack = (event) => {
        setPeer((prevPeer) => {
          let updatedStream: MediaStream;
          if (prevPeer && prevPeer.remoteStream) {
            updatedStream = prevPeer.remoteStream;
            // Avoid adding duplicates.
            if (
              !updatedStream.getTracks().some((t) => t.id === event.track.id)
            ) {
              updatedStream.addTrack(event.track);
            }
          } else if (event.streams && event.streams[0]) {
            updatedStream = event.streams[0];
          } else {
            updatedStream = new MediaStream();
            updatedStream.addTrack(event.track);
          }
          console.log("Callee aggregated remote stream:", updatedStream);
          return {
            peerConnection: pc,
            participantUser: incomingCall.participants.caller,
            remoteStream: updatedStream,
          };
        });
      };

      // Ensure the callee waits for the offer.
      if (!pendingOffer) {
        console.error(
          "Callee: No pending offer available! Cannot answer call."
        );
        return;
      }
      try {
        console.log("Callee: Setting remote description from pending offer");
        await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        const answer = await pc.createAnswer();
        console.log("Callee: Answer created:", answer);
        await pc.setLocalDescription(answer);
        socket.emit("webrtcSignal", {
          sdp: answer,
          candidate: null,
          ongoingCall: incomingCall,
          isCaller: false,
        });
        // setPeer({
        //   peerConnection: pc,
        //   participantUser: incomingCall.participants.caller,
        //   remoteStream: peer?.remoteStream || null,
        // });
        setPendingOffer(null);
      } catch (error) {
        console.error("Callee: Error while answering call:", error);
      }
    },
    [socket, getMediaStream, createPeerConnection, pendingOffer]
  );

  // Hangup: Clean up and notify the other side.
  const handleHangup = useCallback(
    (data: { ongoingCall?: OngoingCall; isEmitHangup?: boolean } = {}) => {
      if (socket && user && data?.ongoingCall && data?.isEmitHangup) {
        socket.emit("hangup", {
          ongoingCall: data.ongoingCall,
          userHangingupId: user.id,
        });
      }
      setOngoingCall(null);
      if (peer && peer.peerConnection) {
        console.log("Closing peer connection");
        peer.peerConnection.close();
      }
      setPeer(null);
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      setIsCallEnded(true);
    },
    [socket, user, peer, localStream]
  );

  // Initialize Socket.IO connection.
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Log connection events.
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => console.log("Socket connected:", socket.id);
    const onDisconnect = () => console.log("Socket disconnected");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // Listen for online user updates.
  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("addNewUser", user);
    socket.on("getUsers", (users: SocketUser[]) => {
      console.log("Online users received:", users);
      setOnlineUsers(users);
    });
    return () => {
      socket.off("getUsers");
    };
  }, [socket, user]);

  // Listen for signaling messages and incoming call events.
  useEffect(() => {
    if (!socket) return;
    const handleSignal = async (data: {
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
      ongoingCall: OngoingCall;
      isCaller: boolean;
    }) => {
      console.log("Received signaling data:", data);
      if (data.sdp) {
        if (data.sdp.type === "offer") {
          console.log("Storing incoming offer (callee side)");
          setPendingOffer(data.sdp);
        } else if (data.sdp.type === "answer") {
          if (peer && peer.peerConnection) {
            try {
              await peer.peerConnection.setRemoteDescription(
                new RTCSessionDescription(data.sdp)
              );
              console.log("Remote description (answer) set successfully");
            } catch (error) {
              console.error(
                "Error setting remote description from answer:",
                error
              );
            }
          }
        }
      } else if (data.candidate) {
        if (peer && peer.peerConnection) {
          try {
            await peer.peerConnection.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
            console.log("ICE candidate added successfully");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      }
    };

    socket.on("webrtcSignal", handleSignal);
    socket.on("incomingCall", (callData: OngoingCall) => {
      console.log("Incoming call event received:", callData);
      // Force the call state to be ringing.
      setOngoingCall({ ...callData, isRinging: true });
    });
    socket.on("hangup", () => {
      console.log("Hangup event received");
      handleHangup();
    });

    return () => {
      socket.off("webrtcSignal", handleSignal);
      socket.off("incomingCall");
      socket.off("hangup");
    };
  }, [socket, peer, ongoingCall, handleHangup]);

  // Reset call-ended flag after a short delay.
  useEffect(() => {
    if (isCallEnded) {
      const timeout = setTimeout(() => {
        setIsCallEnded(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isCallEnded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Optionally, check if a call is ongoing before hanging up.
      if (ongoingCall) {
        // We try to send a hangup signal.
        handleHangup({ ongoingCall, isEmitHangup: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [ongoingCall, handleHangup]);


  return (
    <SocketContext.Provider
      value={{
        onlineUsers,
        peer,
        handleCall,
        ongoingCall,
        localStream,
        handleJoinCall,
        handleHangup,
        isCallEnded,
        pendingOffer,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): ISocketContext => {
  const context = useContext(SocketContext);
  if (context === null) {
    throw new Error("useSocket must be used within a SocketContextProvider");
  }
  return context;
};
