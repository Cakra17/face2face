import { createFileRoute } from "@tanstack/react-router";
import Host from "@/pages/host";

export const Route = createFileRoute("/host")({
	component: Host,
});
