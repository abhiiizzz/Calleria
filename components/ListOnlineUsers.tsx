"use client";

import { useSocket } from "@/context/SocketContext";
import { useUser } from "@clerk/nextjs";
import { List } from "lucide-react";
import Avatar from "./Avatar";

const ListOnlineUsers = () => {
  const { onlineUsers, handleCall } = useSocket();
  const { user } = useUser();
  return (
    <div className="flex border-b border-b-primary/10 w-full">
      {onlineUsers &&
        onlineUsers.map((onlineUser) => {
          if (onlineUser.profile.id === user?.id) return null;
          return (
            <div
              key={onlineUser.userId}
              onClick={() => handleCall(onlineUser)}
              className="flex flex-col items-center gap-1 cursor-pointer"
            >
              <Avatar src={onlineUser.profile.imageUrl} />
              <div className="text-sm">
                {onlineUser.profile.fullName?.split(" ")[0]}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ListOnlineUsers;
