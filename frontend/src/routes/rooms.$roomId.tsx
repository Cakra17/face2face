import Room from '@/pages/room';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/rooms/$roomId')({  
  component: Room,
});
