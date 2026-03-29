import { describe, expect, it } from "vitest";

import { buttonVariants } from "./button";

describe("buttonVariants", () => {
  it("keeps primary CTA text white and secondary CTA text dark", () => {
    expect(buttonVariants({ variant: "default" })).toContain("text-white");
    expect(buttonVariants({ variant: "secondary" })).toContain(
      "text-[color:var(--foreground)]"
    );
  });
});
