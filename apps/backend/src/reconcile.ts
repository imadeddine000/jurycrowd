import { prisma } from './db.js';
import * as tmux from './tmux/tmuxManager.js';

/**
 * Reconciliation on boot (§7.3).
 * Cross-checks DB AgentSession rows (status="running") against actual tmux sessions.
 * Any DB row whose tmux session no longer exists gets status="crashed".
 */
export async function reconcileSessions(): Promise<{ checked: number; crashed: number }> {
  const runningSessions = await prisma.agentSession.findMany({
    where: { status: 'running' },
  });

  const liveTmuxSessions = new Set(tmux.listSessions());

  let crashed = 0;
  for (const session of runningSessions) {
    if (!liveTmuxSessions.has(session.tmuxSession)) {
      await prisma.agentSession.update({
        where: { id: session.id },
        data: { status: 'crashed' },
      });
      crashed++;
      console.log(`[reconcile] session "${session.tmuxSession}" marked as crashed (tmux session no longer exists)`);
    }
  }

  console.log(`[reconcile] checked ${runningSessions.length} running sessions, ${crashed} marked as crashed`);
  return { checked: runningSessions.length, crashed };
}
