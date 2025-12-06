import fs from "fs";
import path from "path";

export function loadPolicyFile(name: string): string {
  const filePath = path.join(process.cwd(), "policies", name);
  return fs.readFileSync(filePath, "utf8");
}

export const policies = {
  returns: loadPolicyFile("returns_policy.md"),
  warranty: loadPolicyFile("warranty_policy.md"),
};

export function retrieveRelevantPolicies(text: string): string {
    const lower = text.toLowerCase();
    const chunks: string[] = [];
  
    if (
      lower.includes("damage") ||
      lower.includes("broken") ||
      lower.includes("defect")
    ) {
      chunks.push(policies.returns);
      chunks.push(policies.warranty);
    }
  
    if (
      lower.includes("charge") ||
      lower.includes("invoice") ||
      lower.includes("duplicate")
    ) {
      chunks.push(policies.returns); // finance escalation rule lives here
    }
  
    // fallback: send both
    if (chunks.length === 0) {
      chunks.push(policies.returns);
      chunks.push(policies.warranty);
    }
  
    return chunks.join("\n\n");
  }
  