import { useRef, useState } from "react";

export default function useCamera() {
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
  
  return {
    videoRef, 
    webcamActive,
    mediaStream,
    toggleWebcam
  };
}