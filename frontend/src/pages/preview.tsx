import React, { useEffect } from "react";
import useCamera from "@/camera";
import Button from "@/components/button";
import { Client } from "@/websocket";
import { Camera, CameraOff } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export default function Preview() {
  const {videoRef, webcamActive, toggleWebcam} = useCamera();
  const navigate = useNavigate();
  let client: Client;

  useEffect(() => {
    client = new Client("ws://localhost:6969/api/v1/ws");
  }, []);

  const handleRoomId = (event: React.FocusEvent<HTMLInputElement>) => {
    const { value } = event.target;
    client.setRoomId(value);
  };

  const handleJoin = (event: React.SubmitEvent) => {
    event.preventDefault();
    client.joinRoom();
    const roomId = client.getRoomId();
    navigate({ to: "/rooms/$roomId", params: {roomId}});
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
              ref={videoRef}
              width="1280" height="720"
              className={`w-full h-auto rounded-xl`}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row gap-2 items-center">
              {webcamActive ? 
                (<Button onClick={toggleWebcam} Icon={Camera} variant="active" />) : 
                (<Button onClick={toggleWebcam} Icon={CameraOff} variant="deactivate" />)
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
