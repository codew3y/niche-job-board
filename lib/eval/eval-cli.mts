/** `npm run eval` — see lib/eval/run-eval.ts. */
import { runEval } from './run-eval';


const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('GEMINI_API_KEY is not set — the eval cannot run without it.');
  process.exit(1);
}

const report = await runEval(key);

console.log('\nPer job (client direction):');
for (const row of report.perJob) {
  console.log(`  ${row.id}  nDCG@5 ${row.ndcg5.toFixed(3)}  p@1 ${row.p1}  top: ${row.top3.join(', ')}`);
}

console.log('\nGates:');
let failed = 0;
for (const gate of report.passes) {
  if (!gate.pass) failed++;
  const shown = Number.isInteger(gate.value) ? String(gate.value) : gate.value.toFixed(3);
  console.log(
    `  ${gate.pass ? 'PASS' : 'FAIL'}  ${gate.name.padEnd(22)} ${shown.padStart(6)}  (gate ${gate.gate})`,
  );
}

console.log(failed === 0 ? '\nAll gates green — M3 metric criteria met.' : `\n${failed} gate(s) failing.`);
process.exit(failed === 0 ? 0 : 1);
