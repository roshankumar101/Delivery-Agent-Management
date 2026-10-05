import { permanentlyDeleteExpiredAgents } from '../services/agentCleanup.service';

const cleanupIntervalMs = 24 * 60 * 60 * 1000;

export function startAgentCleanupJob(): () => void {
  let isRunning = false;

  const runCleanup = async (): Promise<void> => {
    if (isRunning) return;
    isRunning = true;

    try {
      const deletedCount = await permanentlyDeleteExpiredAgents();
      if (deletedCount > 0) {
        console.info(`Permanently deleted ${deletedCount} expired delivery agent(s).`);
      }
    } catch (error) {
      console.error('Scheduled delivery-agent cleanup failed; it will retry at the next interval.', error);
    } finally {
      isRunning = false;
    }
  };

  void runCleanup();
  const interval = setInterval(() => {
    void runCleanup();
  }, cleanupIntervalMs);
  interval.unref();

  return () => clearInterval(interval);
}
