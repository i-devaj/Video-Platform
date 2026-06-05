import express from 'express';
import { handledownload, getalldownloads, checkdownloadlimit } from '../controllers/download.js';

const routes = express.Router();

routes.get('/:userId', getalldownloads);
routes.get('/check/:userId', checkdownloadlimit);
routes.post('/:videoId', handledownload);

export default routes;
