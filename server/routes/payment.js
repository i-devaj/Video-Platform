import express from "express";
import { createorder, verifypayment, cancelsubscription } from "../controllers/payment.js";

const routes = express.Router();

routes.post("/createorder", createorder);
routes.post("/verify", verifypayment);
routes.post("/cancel", cancelsubscription);

export default routes;
