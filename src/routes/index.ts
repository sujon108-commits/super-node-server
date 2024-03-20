import { Router } from "express";
import MatchController from "../controllers/api/MatchController";
import OddsController from "../controllers/api/OddsController";
import CasinoController from "../controllers/api/CasinoController";

const router = Router();
router.post("/save-match", MatchController.addMatchAndMarket);
router.post("/delete-market", MatchController.deleteMarket);
router.post("/test-event", MatchController.testingSocketEvents);

router.get("/get-sports", OddsController.getSports);
router.get("/get-odds", OddsController.getOdds);
router.get("/get-series", OddsController.getSeries);
router.get("/get-matches", OddsController.getMatchList);
router.get("/get-matches-t10", OddsController.getMatchListT10);
router.get("/get-bookmaker-odds", OddsController.getOdds);
router.get("/get-single-session", OddsController.getSingleSessionMarket);
router.get("/get-marketes", OddsController.getMarketList);
router.get("/get-marketes-t10", OddsController.getMarketList);
router.get("/get-bookmaker-marketes", OddsController.getMarketList);
router.get("/get-sessions", OddsController.getSessions);
router.get("/get-sessions-t10", OddsController.getSessions);
router.get("/fancy-data", OddsController.fancyData);
router.get("/market-data", OddsController.marketData);
router.get("/get-odds-single", OddsController.getMakerOddsSingle);
router.get("/get-series-redis/:sportsId", OddsController.getSeriesListRedis);
router.get("/get-odds-result", OddsController.getResults);

router.get("/get-casino-market/:type", new CasinoController().getCasinoMarket);
router.get(
  "/get-single-market/:type/:selectionId",
  new CasinoController().getSingleMarket
);

export default router;
