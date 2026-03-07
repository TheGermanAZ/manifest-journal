import { describe, it, expect } from "vitest";
import { parseAndValidateAnalysis, EMOTIONAL_TONES } from "./ai";

describe("parseAndValidateAnalysis", () => {
  const validJson = JSON.stringify({
    patternInsight: "You show growth",
    nudge: "Keep going",
    emotionalTone: "hopeful",
    alignmentScore: 7,
    alignmentRationale: "Good progress",
    breakthroughScore: 5,
    dimensions: [{ name: "career", relevance: 8, alignmentScore: 7 }],
    neglectedDimensions: ["wealth"],
    dimensionPrompt: "What about your finances?",
  });

  it("parses valid JSON correctly", () => {
    const { result, parseFailed } = parseAndValidateAnalysis(validJson);
    expect(parseFailed).toBe(false);
    expect(result.patternInsight).toBe("You show growth");
    expect(result.emotionalTone).toBe("hopeful");
    expect(result.alignmentScore).toBe(7);
    expect(result.breakthroughScore).toBe(5);
    expect(result.dimensions).toHaveLength(1);
    expect(result.dimensions[0].name).toBe("career");
    expect(result.neglectedDimensions).toEqual(["wealth"]);
    expect(result.dimensionPrompt).toBe("What about your finances?");
  });

  it("strips markdown code fences", () => {
    const wrapped = "```json\n" + validJson + "\n```";
    const { result, parseFailed } = parseAndValidateAnalysis(wrapped);
    expect(parseFailed).toBe(false);
    expect(result.patternInsight).toBe("You show growth");
  });

  it("strips bare code fences (no language tag)", () => {
    const wrapped = "```\n" + validJson + "\n```";
    const { result, parseFailed } = parseAndValidateAnalysis(wrapped);
    expect(parseFailed).toBe(false);
    expect(result.alignmentScore).toBe(7);
  });

  it("returns fallback on invalid JSON", () => {
    const { result, parseFailed } = parseAndValidateAnalysis("not json at all");
    expect(parseFailed).toBe(true);
    expect(result.patternInsight).toContain("Unable to analyze");
    expect(result.emotionalTone).toBe("hopeful");
    expect(result.alignmentScore).toBe(5);
  });

  it("returns fallback on empty string", () => {
    const { result, parseFailed } = parseAndValidateAnalysis("");
    expect(parseFailed).toBe(true);
  });

  // Emotional tone validation
  it("defaults unknown emotional tone to 'hopeful'", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), emotionalTone: "angry" });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.emotionalTone).toBe("hopeful");
  });

  it.each([...EMOTIONAL_TONES])("accepts valid tone: %s", (tone) => {
    const json = JSON.stringify({ ...JSON.parse(validJson), emotionalTone: tone });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.emotionalTone).toBe(tone);
  });

  // Score clamping
  it("clamps alignmentScore above 10 to 10", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), alignmentScore: 15 });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.alignmentScore).toBe(10);
  });

  it("clamps alignmentScore below 1 to 1", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), alignmentScore: -3 });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.alignmentScore).toBe(1);
  });

  it("rounds alignmentScore to nearest integer", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), alignmentScore: 7.6 });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.alignmentScore).toBe(8);
  });

  it("clamps breakthroughScore to 0-10", () => {
    const over = JSON.stringify({ ...JSON.parse(validJson), breakthroughScore: 20 });
    expect(parseAndValidateAnalysis(over).result.breakthroughScore).toBe(10);

    const under = JSON.stringify({ ...JSON.parse(validJson), breakthroughScore: -5 });
    expect(parseAndValidateAnalysis(under).result.breakthroughScore).toBe(0);
  });

  it("defaults missing breakthroughScore to 3", () => {
    const data = JSON.parse(validJson);
    delete data.breakthroughScore;
    const { result } = parseAndValidateAnalysis(JSON.stringify(data));
    expect(result.breakthroughScore).toBe(3);
  });

  // Dimension validation
  it("filters out invalid dimension names", () => {
    const json = JSON.stringify({
      ...JSON.parse(validJson),
      dimensions: [
        { name: "career", relevance: 5, alignmentScore: 5 },
        { name: "bogus", relevance: 5, alignmentScore: 5 },
        { name: "health", relevance: 3, alignmentScore: 8 },
      ],
    });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.dimensions).toHaveLength(2);
    expect(result.dimensions.map((d) => d.name)).toEqual(["career", "health"]);
  });

  it("clamps dimension scores to 0-10", () => {
    const json = JSON.stringify({
      ...JSON.parse(validJson),
      dimensions: [{ name: "wealth", relevance: 15, alignmentScore: -2 }],
    });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.dimensions[0].relevance).toBe(10);
    expect(result.dimensions[0].alignmentScore).toBe(0);
  });

  it("handles non-array dimensions gracefully", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), dimensions: "not an array" });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.dimensions).toEqual([]);
  });

  // Neglected dimensions validation
  it("filters out invalid neglected dimension names", () => {
    const json = JSON.stringify({
      ...JSON.parse(validJson),
      neglectedDimensions: ["career", "unknown", "health"],
    });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.neglectedDimensions).toEqual(["career", "health"]);
  });

  it("handles non-array neglectedDimensions", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), neglectedDimensions: 42 });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.neglectedDimensions).toEqual([]);
  });

  // dimensionPrompt validation
  it("defaults non-string dimensionPrompt to empty string", () => {
    const json = JSON.stringify({ ...JSON.parse(validJson), dimensionPrompt: 123 });
    const { result } = parseAndValidateAnalysis(json);
    expect(result.dimensionPrompt).toBe("");
  });
});
