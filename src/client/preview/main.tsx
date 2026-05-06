import { StrictMode, Component, type ReactNode, type ErrorInfo } from "react"
import { createRoot } from "react-dom/client"
import "../index.css"

class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ color: "#dc2626", padding: 16, fontFamily: "monospace", whiteSpace: "pre-wrap" as const }}>
          <strong>Render Error:</strong>
          {"\n"}
          {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

const params = new URLSearchParams(location.search)
const file = params.get("file")

if (!file) {
  document.getElementById("root")!.textContent = "No file specified"
} else {
  import(/* @vite-ignore */ "/" + file)
    .then((mod) => {
      const Component = mod.default
      if (!Component) throw new Error("No default export found in " + file)

      const propsParam = params.get("props")
      let props = {}
      if (propsParam) {
        try {
          props = JSON.parse(propsParam)
        } catch {
          props = {}
        }
      }

      createRoot(document.getElementById("root")!).render(
        <StrictMode>
          <PreviewErrorBoundary>
            <Component {...props} />
          </PreviewErrorBoundary>
        </StrictMode>,
      )
    })
    .catch((err: Error) => {
      document.getElementById("root")!.innerHTML =
        `<div style="color:#dc2626;padding:16px;font-family:monospace;white-space:pre-wrap"><strong>Module Error:</strong>\n${err.message}</div>`
    })
}
