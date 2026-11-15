// Dedicated background worker. Run alongside `next start` with DISABLE_INPROCESS_WORKER=1
// when you deploy multiple web instances or want image/ZIP processing isolated.
import { kickWorker, startScheduler } from "@/server/jobs";

console.log("[worker] started — processing queued jobs");
startScheduler();
void kickWorker();
