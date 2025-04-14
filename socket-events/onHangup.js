// onHangup.js
import { io } from "../server.js";

const onHangup = async (data) => {
  let targetSocketId;
  if (data.ongoingCall.participants.caller.userId === data.userHangingupId) {
    targetSocketId = data.ongoingCall.participants.receiver.socketId;
  } else {
    targetSocketId = data.ongoingCall.participants.caller.socketId;
  }
  if (targetSocketId) {
    io.to(targetSocketId).emit("hangup");
  }
};

export default onHangup;
