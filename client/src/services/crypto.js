async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
  const pubKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(pubKey))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privKey)))
  }
}

async function deriveSharedKey(privateKeyB64, publicKeyB64) {
  const privBuf = Uint8Array.from(atob(privateKeyB64), c => c.charCodeAt(0))
  const pubBuf = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0))
  const privateKey = await window.crypto.subtle.importKey('pkcs8', privBuf, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])
  const publicKey = await window.crypto.subtle.importKey('spki', pubBuf, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const aesKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
  return aesKey
}

async function encryptMessage(plaintext, aesKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  }
}

async function decryptMessage(encrypted, aesKey) {
  const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0))
  const data = Uint8Array.from(atob(encrypted.data), c => c.charCodeAt(0))
  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, data)
  return new TextDecoder().decode(decrypted)
}

export const cryptoService = { generateKeyPair, deriveSharedKey, encryptMessage, decryptMessage }
