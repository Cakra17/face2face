import { useConnection } from "@/connection";
import React from "react";
import Button from "@/components/button";
import { Camera, CameraOff, Mic, MicOff } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export default function Preview() {
  const clientCtx = useConnection();
  const navigate = useNavigate();

  const handleRoomId = (event: React.FocusEvent<HTMLInputElement>) => {
    const { value } = event.target;
    console.log(value);
  };

  const makeId = () => {
    return crypto.randomUUID();
  }

  const handleJoin = async (event: React.SubmitEvent) => {
    event.preventDefault();
    const stream = await clientCtx.localMedia.startWebcam();
    clientCtx.connect("room-1", makeId(), stream);
    navigate({ to: "/rooms/$roomId", params: {roomId: "room-1"}});
  }; 
  
  return (
    <section className="w-full min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col items-center justify-center min-h-dvh gap-8 px-4 py-8 sm:gap-12">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2">Prepare to join room...</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full sm:min-h-[420px] max-w-4xl p-4">
          <div className="col-span-2 relative">
            <video
              id="webcam"
              autoPlay
              playsInline
              muted
              ref={clientCtx.localMedia.videoRef}
              width="1280" height="720"
              className={`w-full h-auto rounded-xl`}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row gap-2 items-center">
              { clientCtx.localMedia.webcamActive ? 
                (<Button onClick={clientCtx.localMedia.toggleWebcam} Icon={Camera} variant="active" />) : 
                (<Button onClick={clientCtx.localMedia.toggleWebcam} Icon={CameraOff} variant="deactivate" />)
              }
              { clientCtx.localMedia.micActive ? 
                (<Button onClick={clientCtx.localMedia.toggleAudio} Icon={Mic} variant="active" />) : 
                (<Button onClick={clientCtx.localMedia.toggleAudio} Icon={MicOff} variant="deactivate" />)
              }
            </div>
          </div>
          <div className="flex justify-center items-center p-2">
            <form onSubmit={handleJoin} method="GET" className="w-full">
              <div className="flex flex-col gap-1 mb-2">
                <label className="font-bold">Room ID</label>
                <input onBlur={handleRoomId} type="text" className="border-1 rounded-sm p-2 font-bold" />
              </div>
              <button
                type="submit"
                className="cursor-pointer bg-red-400 hover:bg-red-300 rounded-xl w-full p-2 font-bold">
                Join Room
              </button>
            </form>
          </div>
        </div>
      </div>
    </section >
  )
}
