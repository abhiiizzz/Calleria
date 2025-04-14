// server.js
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import onCall from "./socket-events/onCall.js";
import onWebrtcSignal from "./socket-events/onWebrtcSignal.js";
import onHangup from "./socket-events/onHangup.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

export let io;

// Global list to hold ongoing calls
let ongoingCalls = [];

console.log("Server Running...");
app.prepare().then(() => {
  const httpServer = createServer(handler);
  io = new Server(httpServer);

  let onlineUsers = [];

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("addNewUser", (clerkUser) => {
      if (
        clerkUser &&
        !onlineUsers.some((user) => user?.userId === clerkUser.id)
      ) {
        onlineUsers.push({
          userId: clerkUser.id,
          socketId: socket.id,
          profile: clerkUser,
        });
      }
      io.emit("getUsers", onlineUsers);
    });

    socket.on("disconnect", () => {
      // Remove user from onlineUsers list.
      onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
      io.emit("getUsers", onlineUsers);

      // Check each ongoing call – if this socket is one of the participants, notify the other.
      ongoingCalls.forEach((call) => {
        const { caller, receiver } = call.participants;
        if (caller.socketId === socket.id || receiver.socketId === socket.id) {
          // Identify the other party:
          const targetSocketId =
            caller.socketId === socket.id ? receiver.socketId : caller.socketId;
          if (targetSocketId) {
            io.to(targetSocketId).emit("hangup");
          }
        }
      });

      // Optionally remove calls that involve the disconnected socket
      ongoingCalls = ongoingCalls.filter((call) => {
        const { caller, receiver } = call.participants;
        return caller.socketId !== socket.id && receiver.socketId !== socket.id;
      });
    });

    // Use our onCall, onWebrtcSignal, and onHangup handlers.
    socket.on("call", (participants) => {
      // When a call is initiated, add it to ongoingCalls.
      const ongoingCall = { participants, isRinging: true };
      ongoingCalls.push(ongoingCall);
      onCall(participants);
    });

    socket.on("webrtcSignal", onWebrtcSignal);
    socket.on("hangup", (data) => {
      onHangup(data);
      // Remove the call from ongoingCalls once hangup is processed.
      ongoingCalls = ongoingCalls.filter((call) => call !== data.ongoingCall);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
