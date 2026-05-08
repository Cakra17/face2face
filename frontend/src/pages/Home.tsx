import Card from '@/components/Card'

export default function Home() {
  return (
    <section className="w-full min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col items-center justify-center min-h-dvh gap-8 px-4 py-8 sm:gap-12">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2">Face2Face</h1>
          <p className="text-gray-500 text-base sm:text-lg">Connect face to face, online.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl">
          <Card
            title="Join as Client"
            description="Start a video call as a participant"
            to="/"
          />
          <Card
            title="Create as Host"
            description="Host a new video session"
            to="/"
          />
        </div>
      </div>
    </section>
  )
}