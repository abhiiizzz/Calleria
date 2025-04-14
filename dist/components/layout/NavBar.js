"use client";
import { Video } from "lucide-react";
import Container from "./Container";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "../ui/button";
import dynamic from "next/dynamic";
const UserButton = dynamic(() => import("@clerk/nextjs").then((mod) => mod.UserButton), {
    ssr: false,
    loading: () => <div className="w-8 h-8 rounded-full bg-gray-200"/>,
});
const NavBar = () => {
    const router = useRouter();
    const { userId } = useAuth();
    return (<div className="sticky top-0 border border-b-primary/10">
      <Container>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => router.push("/")}>
            <Video />
            <div className="font-bold text-xl">Calleria</div>
          </div>

          <div className="flex gap-3 items-center">
            <UserButton />
            {!userId && (<>
                <Button onClick={() => router.push("/sign-in")} size="sm" variant="outline">
                  Sign In
                </Button>
                <Button onClick={() => router.push("/sign-up")} size="sm">
                  Sign Up
                </Button>
              </>)}
          </div>
        </div>
      </Container>
    </div>);
};
export default NavBar;
