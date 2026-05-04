// Side-effect entrypoint: importing this file registers every handler
// known to the scheduler. The cron tick endpoint imports it once before
// dispatching so the registry is populated.
//
// As new handler files are added under src/lib/scheduler/handlers/, append
// their import here. They each call registerHandler() at module-eval time.

// Handlers registered so far:
import "./handlers/email-sequence-step";
import "./handlers/playbook-action";
