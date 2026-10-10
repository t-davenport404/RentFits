export async function GET() {
  return Response.json(
    {
      configured: false,
      provider: null,
      mode: "manual",
      message:
        "Manual sources enabled. Automated geographic discovery is not connected.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
