/** Tiny terminal styling — no chalk dependency. */
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

export function banner() {
  console.log(`
${c.magenta('┌─────────────────────────────────────────┐')}
${c.magenta('│')}  ${c.bold('photo-sync')}  ${c.dim('· Google Photos → site')}   ${c.magenta('│')}
${c.magenta('└─────────────────────────────────────────┘')}
`);
}

export function step(n, total, msg) {
  console.log(`${c.cyan(`[${n}/${total}]`)} ${msg}`);
}

export function ok(msg) {
  console.log(`${c.green('✓')} ${msg}`);
}

export function warn(msg) {
  console.log(`${c.yellow('!')} ${msg}`);
}

export function fail(msg) {
  console.error(`${c.red('✗')} ${msg}`);
}

export function info(msg) {
  console.log(`  ${c.dim(msg)}`);
}

export { c };
