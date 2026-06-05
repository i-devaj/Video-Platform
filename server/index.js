import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import subscriptionroutes from "./routes/subscription.js";
import downloadroutes from "./routes/download.js";
import paymentroutes from "./routes/payment.js";
import otproutes from "./routes/otp.js";
import planroutes from "./routes/plan.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/subscription", subscriptionroutes);
app.use("/download", downloadroutes);
app.use("/payment", paymentroutes);
app.use("/otp", otproutes);
app.use("/plan", planroutes);
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app so WebSocket can share the same port
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

// ─── WebSocket Signaling Server for WebRTC ───
const wss = new WebSocketServer({ server });

// In-memory room storage: roomId → [ws, ws] (max 2 per room)
const rooms = new Map();

/**
 * Find which room a socket belongs to and return { roomId, sockets }
 */
function findRoomBySocket(ws) {
  for (const [roomId, sockets] of rooms.entries()) {
    if (sockets.includes(ws)) return { roomId, sockets };
  }
  return null;
}

/**
 * Get the other peer in a room (if any)
 */
function getOtherPeer(sockets, ws) {
  return sockets.find((s) => s !== ws && s.readyState === 1 /* OPEN */);
}

/**
 * Remove a socket from its room and notify the remaining peer
 */
function cleanupSocket(ws) {
  const found = findRoomBySocket(ws);
  if (!found) return;
  const { roomId, sockets } = found;
  const other = getOtherPeer(sockets, ws);
  // Remove the socket from the room
  const remaining = sockets.filter((s) => s !== ws);
  if (remaining.length === 0) {
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, remaining);
  }
  // Notify the remaining peer
  if (other) {
    other.send(JSON.stringify({ type: "user-left" }));
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const { type, roomId, userId, offer, answer, candidate } = msg;

    switch (type) {
      case "join": {
        const { roomId, userId, userName } = msg;
        let existing = rooms.get(roomId) || [];
        if (existing.length >= 2) {
          ws.send(JSON.stringify({ type: "room-full" }));
          return;
        }
        // If someone is already in the room, tell them a new peer joined
        if (existing.length === 1) {
          const peer = existing[0];
          if (peer.readyState === 1) {
            peer.send(JSON.stringify({ type: "user-joined", userId, userName }));
          }
          ws.send(JSON.stringify({ type: "joined", isPolite: true }));
        } else {
          ws.send(JSON.stringify({ type: "joined", isPolite: false }));
        }
        existing.push(ws);
        rooms.set(roomId, existing);
        break;
      }

      case "offer": {
        const sockets = rooms.get(roomId);
        if (!sockets) return;
        const peer = getOtherPeer(sockets, ws);
        if (peer) {
          peer.send(JSON.stringify({ type: "offer", offer, roomId }));
        }
        break;
      }

      case "answer": {
        const sockets = rooms.get(roomId);
        if (!sockets) return;
        const peer = getOtherPeer(sockets, ws);
        if (peer) {
          peer.send(JSON.stringify({ type: "answer", answer, roomId }));
        }
        break;
      }

      case "ice-candidate": {
        const sockets = rooms.get(roomId);
        if (!sockets) return;
        const peer = getOtherPeer(sockets, ws);
        if (peer) {
          peer.send(
            JSON.stringify({ type: "ice-candidate", candidate, roomId })
          );
        }
        break;
      }

      case "screen-share-status": {
        const sockets = rooms.get(roomId);
        if (!sockets) return;
        const peer = getOtherPeer(sockets, ws);
        if (peer) {
          peer.send(
            JSON.stringify({ type: "screen-share-status", isSharing: msg.isSharing })
          );
        }
        break;
      }

      case "camera-status": {
        const sockets = rooms.get(roomId);
        if (!sockets) return;
        const peer = getOtherPeer(sockets, ws);
        if (peer) {
          peer.send(
            JSON.stringify({ type: "camera-status", isCameraOn: msg.isCameraOn })
          );
        }
        break;
      }

      case "leave": {
        cleanupSocket(ws);
        break;
      }
    }
  });

  ws.on("close", () => {
    cleanupSocket(ws);
  });
});

console.log("WebSocket signaling server attached");

const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });

