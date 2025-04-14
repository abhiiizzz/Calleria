import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/layout/NavBar";
import Container from "@/components/layout/Container";
import SocketProvider from "@/providers/SocketProvider";
import { cn } from "@/lib/utils";
import CallNotification from "@/components/CallNotification";
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
export const metadata = {
    title: "Calleria",
    description: "Video Call",
};
export default function RootLayout({ children, }) {
    return (<ClerkProvider>
      <html lang="en">
        <body className={cn(geistSans.variable, geistMono.variable, "antialiased", "relative")}>
          <SocketProvider>
            <main className="flex flex-col min-h-screen bg-secondary">
              <NavBar />
              <CallNotification />
              <Container>{children}</Container>
            </main>
          </SocketProvider>
        </body>
      </html>
    </ClerkProvider>);
}
