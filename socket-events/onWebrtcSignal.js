import { io } from "../server.js";

const onWebrtcSignal = async (data) => {
  let socketIdToEmitTo = null;
  if (data.isCaller) {
    socketIdToEmitTo = data.ongoingCall?.participants?.receiver?.socketId;
  } else {
    socketIdToEmitTo = data.ongoingCall?.participants?.caller?.socketId;
  }
  if (socketIdToEmitTo) {
    io.to(socketIdToEmitTo).emit("webrtcSignal", data);
  }
};

export default onWebrtcSignal;
