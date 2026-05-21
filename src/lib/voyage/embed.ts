const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"

export async function embed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error("Missing VOYAGE_API_KEY")

  const model = process.env.VOYAGE_MODEL || "voyage-3"

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage API error: ${response.status} ${error}`)
  }

  const json = await response.json()
  return json.data.map((d: { embedding: number[] }) => d.embedding)
}
