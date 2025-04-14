import CallNotification from "@/components/CallNotification";
import ListOnlineUsers from "@/components/ListOnlineUsers";
import Recorder from "@/components/Recorder";
import VideoCall from "@/components/VideoCall";
export default function Home() {
    return (<div>
      <ListOnlineUsers />
      <CallNotification />
      <VideoCall />
      <Recorder />
    </div>);
}
