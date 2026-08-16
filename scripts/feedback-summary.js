const fs = require("node:fs");
const path = require("node:path");

const source = process.argv[2] || process.env.FEEDBACK_STORE_PATH;
if (!source) {
  console.error("Usage: npm run feedback:summary -- /path/to/nocturne-feedback.jsonl");
  process.exitCode = 1;
} else {
  const resolved = path.resolve(source);
  if (!fs.existsSync(resolved)) {
    console.error(`Feedback file not found: ${resolved}`);
    process.exitCode = 1;
  } else {
    const rows = fs.readFileSync(resolved, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch (error) { return []; }
    });
    const countBy = (items, field) => items.reduce((counts, item) => {
      const value = typeof item[field] === "string" ? item[field] : "unknown";
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
    const completion = rows.filter((row) => row.kind === "completion" || (!row.kind && row.clarity));
    const exit = rows.filter((row) => row.kind === "exit");
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      total: rows.length,
      completionCount: completion.length,
      exitCount: exit.length,
      cases: countBy(rows, "caseId"),
      releases: countBy(rows, "release"),
      completion: {
        clarity: countBy(completion, "clarity"),
        challenge: countBy(completion, "challenge"),
        roleBalance: countBy(completion, "roleBalance"),
        ending: countBy(completion, "ending"),
        continueSeries: countBy(completion, "continueSeries")
      },
      exits: countBy(exit, "reason")
    }, null, 2));
  }
}
