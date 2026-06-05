import * as Crypto from 'expo-crypto'

export async function generateNonce(): Promise<{ raw: string; hashed: string }> {
  const rawBytes = Crypto.getRandomBytes(32)
  const raw = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    raw
  )
  return { raw, hashed }
}
