export function generateUserAgent() {
  const randomHex = [...Array(16)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
  return `Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.2 ${randomHex}`;
}
