import { main } from "./main";

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Cron job error:", e);
    process.exit(1);
  });