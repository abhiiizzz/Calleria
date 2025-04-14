"use client";
import { useSocket } from "@/context/SocketContext";
import { useUser } from "@clerk/nextjs";
import Avatar from "./Avatar";
const ListOnlineUsers = () => {
    const { onlineUsers, handleCall } = useSocket();
    const { user } = useUser();
    return (<div className="flex border-b border-b-primary/10 w-full">
      {onlineUsers &&
            onlineUsers.map((onlineUser) => {
                var _a;
                if (onlineUser.profile.id === (user === null || user === void 0 ? void 0 : user.id))
                    return null;
                return (<div key={onlineUser.userId} onClick={() => handleCall(onlineUser)} className="flex flex-col items-center gap-1 cursor-pointer">
              <Avatar src={onlineUser.profile.imageUrl}/>
              <div className="text-sm">
                {(_a = onlineUser.profile.fullName) === null || _a === void 0 ? void 0 : _a.split(" ")[0]}
              </div>
            </div>);
            })}
    </div>);
};
export default ListOnlineUsers;
