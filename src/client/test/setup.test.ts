import { describe, it, expect } from "vitest"

describe("test infrastructure", () => {
  it("vitest runs correctly", () => {
    expect(1 + 1).toBe(2)
  })

  it("jest-dom matchers are available", () => {
    const div = document.createElement("div")
    div.textContent = "hello"
    expect(div).toHaveTextContent("hello")
  })
})
