export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.RUN_SCHEDULER !== "true") {
    return;
  }
  const { startScheduler } = await import("./jobs/scheduler");
  startScheduler();
}
