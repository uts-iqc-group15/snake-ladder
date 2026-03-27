const QUOKKA_BASE_URL = "https://{quokka}.quokkacomputing.com/qsim/qasm";

interface QuokkaResponse {
  error: string;
  error_code: number;
  result: {
    c: number[][];
  };
}

export async function sendToQuokka(
  program: string,
  count = 1,
  quokka = "quokka3",
): Promise<number[][]> {
  const url = QUOKKA_BASE_URL.replace("{quokka}", quokka);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script: program, count }),
  });

  if (!res.ok) {
    throw new Error(`Quokka request failed: ${res.status} ${res.statusText}`);
  }

  const data: QuokkaResponse = await res.json();

  if (data.error_code !== 0) {
    throw new Error(`Quokka error: ${data.error}`);
  }

  return data.result.c;
}
