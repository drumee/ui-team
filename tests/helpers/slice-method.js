// tests/helpers/slice-method.js
// Slice one class method out of a source file and return it as a function
// expression, so a test can run the REAL method against a stub `this` without
// requiring a file that only loads under webpack (aliases, DOM, ui-core).
// Same technique as tests/tasks-commit-detail.test.js, shared.
function sliceFunction(src, signature) {
  const start = src.indexOf(`\n  ${signature} {`);
  if (start < 0) throw new Error(`${signature} not found`);
  const end = src.indexOf("\n  }\n", start);
  if (end < 0) throw new Error(`${signature} has no closing brace at 2-space indent`);
  const body = src.slice(start, end + 4).trim();
  return body.replace(/^(async\s+)?([A-Za-z_$][\w$]*)\s*\(/, (m, a, n) => `${a || ""}function ${n}(`);
}

module.exports = { sliceFunction };
