import { splitParts } from "../src/ui/voice";

describe("voice", () => {
  it("speaks English words inside a Hindi line with an English voice", () => {
    const parts = splitParts("सुनो: log। कौन-सा log जैसा शुरू होता है? tree, rain, leaf।", "hi");
    expect(parts.filter(p => p.lang === "en").map(p => p.text)).toEqual(["log", "log", "tree, rain, leaf"]);
    expect(parts.filter(p => p.lang === "hi").length).toBeGreaterThan(0);
  });
  it("splits long English lines into sentences (Chrome stops very long utterances)", () => {
    expect(splitParts("Now it's your turn. Please give me 5 vegetables.", "en")).toHaveLength(2);
  });
  it("keeps a whole English sentence together", () => {
    const parts = splitParts("सुनो: The monkey has a cap. सही तस्वीर छुओ।", "hi");
    expect(parts.some(p => p.lang === "en" && p.text.startsWith("The monkey has a cap"))).toBe(true);
  });
});
