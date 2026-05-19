import { Camera, CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Preview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setMediaStream(stream);
      setWebcamActive(true);
    } catch (error) {
      console.log("Can't open camera", error);
      setWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (!mediaStream) {
      return;
    }
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setMediaStream(null);
    setWebcamActive(false);
  };

  const toggleWebcam = () => {
    if (!mediaStream) {
      startWebcam();
    } else {
      stopWebcam();
    }
  };

  useEffect(() => {
    startWebcam();
  }, []);

  return (
    <section className="w-full min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col items-center justify-center min-h-dvh gap-8 px-4 py-8 sm:gap-12">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2">Prepare to join room...</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full sm:min-h-[420px] max-w-4xl">
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
              <button onClick={toggleWebcam} type="button"
                className={`flex items-center justify-center rounded-2xl w-12 h-12 cursor-pointer backdrop-blur-sm ${webcamActive ?
                  "bg-blue-400/80 hover:bg-blue-300" :
                  "bg-red-400/80 hover:bg-red-300"
                  }`}
              >
                {webcamActive ? (<Camera />) : (<CameraOff />)}
              </button>
            </div>
          </div>
          <div className="flex justify-center items-center">
            <button className="cursor-pointer bg-red-400 hover:bg-red-300 rounded-xl w-[80%] p-2 font-bold">Join Room</button>
          </div>
        </div>
      </div>
    </section >
  )
}
