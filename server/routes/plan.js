import express from "express";
import {
  getallplans,
  getuserplan,
  createplanorder,
  verifyplanpayment,
  cancelplan,
  getusertransactions,
} from "../controllers/plan.js";

const routes = express.Router();

routes.get("/all", getallplans);
routes.get("/user/:userId", getuserplan);
routes.post("/createorder", createplanorder);
routes.post("/verify", verifyplanpayment);
routes.post("/cancel/:userId", cancelplan);
routes.get("/transactions/:userId", getusertransactions);

export default routes;
