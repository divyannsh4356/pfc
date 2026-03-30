export function isTokenExpired(token) {
  if (!token) {
    return true;
  }

  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) {
      return true;
    }

    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) {
      return true;
    }

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
