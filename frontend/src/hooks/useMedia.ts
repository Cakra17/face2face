import { useCallback, useRef, useState } from "react";

export default function useMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);

  const startWebcam = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setMediaStream(stream);
      setWebcamActive(true);
      setMicActive(true);
      return stream;
    } catch (error) {
      console.error("Can't open camera", error);
      setWebcamActive(false);
      throw error;
    }
  }, []);

  const stopWebcam = useCallback(() => {
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
    setMicActive(false);
  }, [mediaStream]);

  const toggleWebcam = useCallback(() => {
    if (!mediaStream) return
    
    const track = mediaStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setWebcamActive(track.enabled);
    }
  }, [mediaStream]);

  const toggleAudio = useCallback(() => {
    if (!mediaStream) return
    
    const track = mediaStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicActive(track.enabled);
    }
  },[mediaStream]);
  
  return {
    videoRef, 
    webcamActive,
    micActive,
    mediaStream,
    toggleWebcam,
    toggleAudio,
    startWebcam,
    stopWebcam,
  };
}