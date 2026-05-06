interface CalloutProps {
  children: React.ReactNode
  type?: "info" | "warning" | "error"
}

export default function Callout({ children, type = "info" }: CalloutProps) {
  const colors = {
    info: "border-blue-500 bg-blue-50 text-blue-900",
    warning: "border-yellow-500 bg-yellow-50 text-yellow-900",
    error: "border-red-500 bg-red-50 text-red-900",
  }

  return (
    <div className={`border-l-4 p-4 rounded-r ${colors[type]}`}>
      {children}
    </div>
  )
}
