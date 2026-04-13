import express from "express";
import {
  handlesubscription,
  checksubscription,
  getsubscribercount,
  getallsubscriptions,
} from "../controllers/subscription.js";

const routes = express.Router();
routes.post("/:channelId", handlesubscription);
routes.get("/check/:userId/:channelId", checksubscription);
routes.get("/count/:channelId", getsubscribercount);
routes.get("/:userId", getallsubscriptions);
export default routes;
