import { useEffect, useRef, useState } from "react";

export default function Preview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMediaStream(stream);
    } catch (error) {
      console.log("Can't open camera", error);
    }
  };

  const stopWebcam = () => {
    if (!mediaStream) {
      return;
    }
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
    setMediaStream(null);
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
          <video id="webcam" autoPlay playsInline ref={videoRef} className="rounded-xl col-span-2"></video>
          <div className="flex justify-center items-center">
            <button type="button" className="cursor-pointer bg-indigo-300 max-h-10 w-[70%] text-white/90 rounded-md min-h-[5vh]">Join Room</button>
          </div>
        </div>
        {/* TODO: make a button turn off camera */}
      </div>
    </section>
  )
}