import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PreviewFrame } from "./preview-frame"

describe("PreviewFrame", () => {
  it("renders an iframe with correct src URL including file param", () => {
    render(<PreviewFrame file="content/test.tsx" />)
    const iframe = screen.getByTitle("Preview: content/test.tsx")
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute("src", expect.stringContaining("file=content%2Ftest.tsx"))
  })

  it("includes props in URL when provided", () => {
    const props = { title: "Hello", count: 42 }
    render(<PreviewFrame file="content/test.tsx" props={props} />)
    const iframe = screen.getByTitle("Preview: content/test.tsx")
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute("src", expect.stringContaining("file=content%2Ftest.tsx"))
    expect(iframe).toHaveAttribute("src", expect.stringContaining("props="))
    expect(iframe).toHaveAttribute("src", expect.stringContaining("title"))
    expect(iframe).toHaveAttribute("src", expect.stringContaining("Hello"))
  })

  it("omits props param when props is empty object", () => {
    render(<PreviewFrame file="content/test.tsx" props={{}} />)
    const iframe = screen.getByTitle("Preview: content/test.tsx")
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute("src", expect.stringContaining("file=content%2Ftest.tsx"))
    expect(iframe).toHaveAttribute("src", expect.not.stringContaining("props="))
  })

  it("omits props param when props is undefined", () => {
    render(<PreviewFrame file="content/test.tsx" />)
    const iframe = screen.getByTitle("Preview: content/test.tsx")
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute("src", expect.stringContaining("file=content%2Ftest.tsx"))
    expect(iframe).toHaveAttribute("src", expect.not.stringContaining("props="))
  })

  it("applies custom className", () => {
    const { container } = render(
      <PreviewFrame file="content/test.tsx" className="custom-frame" />
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toHaveClass("custom-frame")
    expect(iframe).not.toHaveClass("w-full", "h-full", "border-0")
  })

  it("has default className when not provided", () => {
    const { container } = render(<PreviewFrame file="content/test.tsx" />)
    const iframe = container.querySelector("iframe")
    expect(iframe).toHaveClass("w-full", "h-full", "border-0")
  })

  it("has sandbox attribute", () => {
    render(<PreviewFrame file="content/test.tsx" />)
    const iframe = screen.getByTitle("Preview: content/test.tsx")
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin")
  })

  it("has title attribute with file name", () => {
    render(<PreviewFrame file="content/test.tsx" />)
    const iframe = screen.getByTitle("Preview: content/test.tsx")
    expect(iframe).toHaveAttribute("title", "Preview: content/test.tsx")
  })
})
