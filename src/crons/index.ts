import { initializeClearOfferDataJob } from "./ClearOfferData.cron";

export default function initializeCrons() {
    initializeClearOfferDataJob();
}