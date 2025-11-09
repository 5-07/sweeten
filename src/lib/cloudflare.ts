export async function cfRunPrompt(prompt: string) {
  if (!process.env.CF_API_KEY || !process.env.CF_ACCOUNT_ID || !process.env.CF_MODEL) {
    throw new Error("Missing Cloudflare AI env vars");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${process.env.CF_MODEL}`;
  const body = {
    // Some models want chat format, others just "prompt".
    // We'll send both to be safe.
    prompt,
    messages: [
      { role: "system", content: "You generate JSON lifestyle plans only." },
      { role: "user", content: prompt },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  console.log("⚡ Cloudflare raw response:", rawText);

  if (!res.ok) {
    throw new Error(`Cloudflare error ${res.status}: ${rawText}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = { result: rawText };
  }

  // Cloudflare usually puts result in parsed.result
  return parsed?.result?.response || parsed?.result || parsed?.output || "";

