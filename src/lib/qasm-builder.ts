export function buildSingleQubitQASM(ladderProb: number): string {
  const theta = 2 * Math.acos(Math.sqrt(ladderProb))
  return `OPENQASM 2.0;
qreg q[1];
creg c[1];
ry(${theta}) q[0];
measure q[0] -> c[0];`
}

export function buildEntangledQASM(): string {
  return `OPENQASM 2.0;
qreg q[2];
creg c[2];
h q[0];
cx q[0], q[1];
h q[0];
measure q[0] -> c[0];
measure q[1] -> c[1];`
}
