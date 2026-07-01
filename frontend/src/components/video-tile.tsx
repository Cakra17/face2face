interface VideoTileProps {
	stream?: MediaStream | null;
	label?: string;
	muted?: boolean;
}

export default function VideoTile({ stream, label, muted }: VideoTileProps) {
	return (
		<div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
			<video
				autoPlay
				playsInline
				muted={muted}
				ref={(el) => {
					if (el && stream) el.srcObject = stream;
				}}
				className="w-full h-full object-cover"
			/>
			{label && (
				<span className="absolute bottom-2 left-2 text-white text-sm font-medium bg-black/40 px-2 py-0.5 rounded-md">
					{label}
				</span>
			)}
		</div>
	);
}
