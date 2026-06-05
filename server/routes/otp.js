import express from 'express';
import { sendotp, verifyotp } from '../controllers/otp.js';

const routes = express.Router();

routes.post('/send', sendotp);
routes.post('/verify', verifyotp);

export default routes;
