import readline from "node:readline";

/** Reads a line from the terminal; with hidden=true the input is not echoed. */
export function ask(question: string, hidden = false): Promise<string> {
  // Non-interactive use (CI / hosting shell): read lines from piped stdin.
  if (!process.stdin.isTTY) return readPipedLine();
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
      out._writeToOutput = (s: string) => {
        if (s.includes(question)) out.output.write(s);
        else if (s === "\r\n" || s === "\n") out.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

let buffered: string[] | null = null;
async function readPipedLine(): Promise<string> {
  if (!buffered) {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    buffered = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
  }
  return buffered.shift() ?? "";
}
