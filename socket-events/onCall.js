// onCall.js
import { io } from "../server.js";

const onCall = async (participants) => {
  const ongoingCall = { participants, isRinging: true };
  if (participants?.receiver?.socketId) {
    io.to(participants.receiver.socketId).emit("incomingCall", ongoingCall);
  }
};

export default onCall;
