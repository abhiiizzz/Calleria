// /types/index.ts

import { User } from "@clerk/nextjs/server";

export type SocketUser = {
  userId: string;
  socketId: string;
  profile: User;
};

export type OngoingCall = {
  participants: Participants;
  isRinging: boolean;
};

export type Participants = {
  caller: SocketUser;
  receiver: SocketUser;
};

export type PeerData = {
  peerConnection: RTCPeerConnection;
  remoteStream: MediaStream | null; // Allow null when the remote stream is not available.
  participantUser: SocketUser;
};
