export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DISABLE_INPROCESS_WORKER !== "1") {
    const { startScheduler } = await import("@/server/jobs");
    startScheduler();
  }
}
