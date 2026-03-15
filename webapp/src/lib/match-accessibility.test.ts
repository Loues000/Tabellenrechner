import { describe, expect, it } from "vitest";
import {
  getGuestScoreInputLabel,
  getHomeScoreInputLabel,
  getMatchResetLabel,
} from "./match-accessibility";

describe("match accessibility labels", () => {
  it("returns a non-empty home score label with fixture context", () => {
    expect(getHomeScoreInputLabel("SG Essen", "TuS Steele")).toBe(
      "Heimtore für SG Essen gegen TuS Steele",
    );
  });

  it("returns a non-empty away score label with fixture context", () => {
    expect(getGuestScoreInputLabel("SG Essen", "TuS Steele")).toBe(
      "Gasttore für TuS Steele bei SG Essen",
    );
  });

  it("returns a fixture-specific reset label", () => {
    expect(getMatchResetLabel("SG Essen", "TuS Steele")).toBe(
      "Tipp für SG Essen gegen TuS Steele zurücksetzen",
    );
  });
});
