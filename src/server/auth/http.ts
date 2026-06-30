export function redirectResponse(location: string | URL, status = 302): Response {
  return new Response(null, {
    headers: { location: location.toString() },
    status,
  })
}
