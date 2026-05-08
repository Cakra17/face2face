import { Link } from '@tanstack/react-router'

interface CardProps {
  title: string
  to: string
  description?: string
}

export default function Card({ title, to, description }: CardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
      <Link
        to={to}
        className="block"
      >
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
        {description && <p className="text-gray-500 mb-4">{description}</p>}
        <span className="inline-flex items-center text-blue-500 font-medium">
          Get started
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </Link>
    </div>
  )
}