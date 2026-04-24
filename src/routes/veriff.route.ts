import express from 'express';
import { Router } from 'express'
import { veriffDecisionWebhook, veriffEventWebhook } from '../controllers/veriff/veriff-webhook.controller';
const expressRawJson = express.raw({ type: "application/json" });
const veriffRouter = Router()

veriffRouter.post(
    "/webhook/decision",
    expressRawJson,
    veriffDecisionWebhook
);

veriffRouter.post(
    "/webhook/event",
    expressRawJson,
    veriffEventWebhook
);

export default veriffRouter