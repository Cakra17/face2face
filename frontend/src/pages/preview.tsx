import React, { useEffect, useRef } from "react";
// import Button from "@/components/button";
// import { Camera, CameraOff } from "lucide-react";

export default function Preview() {
  const videoRef = useRef<HTMLVideoElement>(null);

  function makeId(): string {
    return crypto.randomUUID();
  }

  useEffect(() => {  
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).
    then((stream) => {
      const pc = new RTCPeerConnection();
      pc.ontrack = (event) => {
        if (event.track.kind === "audio") return;

        const el = document.createElement("video");
        el.srcObject = event.streams[0];
        el.autoplay = true;

        document.getElementById("remoteVideos")?.appendChild(el);

      	event.streams[0].onremovetrack = () => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
      	}
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const ws = new WebSocket("ws://localhost:6969/api/v1/ws")

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        ws.send(JSON.stringify({ type: "candidate", data: JSON.stringify(ev.candidate) }));
      }

      ws.onclose = function () {
        window.alert("Websocket has closed");
      }

      ws.onmessage = async (evt) => {
        let msg = JSON.parse(evt.data);
        if (!msg) {
          return console.log('failed to parse msg');
        }

        switch (msg.type) {
          case 'offer':
            let offer = JSON.parse(msg.data);
            if (!offer) {
              return console.log('failed to parse answer');
            }
            pc.setRemoteDescription(offer);
            pc.createAnswer().then(answer => {
              pc.setLocalDescription(answer);
              ws.send(JSON.stringify({ type: 'answer', data: JSON.stringify(answer) }));
            });
            return;

          case 'candidate':
            let candidate = JSON.parse(msg.data);
            if (!candidate) {
              return console.log('failed to parse candidate');
            }

            pc.addIceCandidate(candidate);
        }
      }

      ws.onerror = function (evt) {
        console.log("ERROR: " + evt);
      }

      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ type: "join", room_id: "room-1", peer_id: makeId() }));
      });

    });
  }, []);

  const handleRoomId = (event: React.FocusEvent<HTMLInputElement>) => {
    const { value } = event.target;
    console.log(value);
  };

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault();
    // const roomId = clientRef.current.getRoomId();
    // navigate({ to: "/rooms/$roomId", params: {roomId}});
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
              ref={videoRef}
              width="1280" height="720"
              className={`w-full h-auto rounded-xl`}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row gap-2 items-center">
              {/* {webcamActive ? 
                (<Button onClick={toggleWebcam} Icon={Camera} variant="active" />) : 
                (<Button onClick={toggleWebcam} Icon={CameraOff} variant="deactivate" />)
              } */}
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

          {/* remote */}
          <div id="remoteVideos"></div>
        </div>
      </div>
    </section >
  )
}
