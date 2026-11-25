import os from "os";
import { defineConfig } from "vite";
import { WebSocketServer } from "ws";

function getLocalIPv4s() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const info of list || []) {
      if (info.family === "IPv4" && !info.internal) {
        ips.push(info.address);
      }
    }
  }
  return ips;
}

function attachShareEndpoint(middlewares) {
  if (!middlewares) return;
  middlewares.use((req, res, next) => {
    if (req.url === "/" || req.url?.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    next();
  });
  middlewares.use("/api/share-info", (req, res) => {
    const hostHeader = req.headers.host || "localhost:4174";
    const port = hostHeader.includes(":") ? hostHeader.split(":")[1] : "4174";
    const ips = getLocalIPv4s();
    const urls = ips.map((ip) => `http://${ip}:${port}`);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ urls, primaryUrl: urls[0] || `http://${hostHeader}` }));
  });
}

function attachMultiplayerWS(httpServer) {
  if (!httpServer || httpServer.__winterWssAttached) return;
  httpServer.__winterWssAttached = true;

  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map();
  const snowmen = new Map();
  let nextId = 1;

  function broadcast(payload, excludeWs = null) {
    const raw = JSON.stringify(payload);
    for (const [client] of clients) {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(raw);
      }
    }
  }

  httpServer.on("upgrade", (req, socket, head) => {
    if (!req.url || !req.url.startsWith("/ws")) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    const id = `p${nextId++}`;

    ws.on("message", (buf) => {
      let msg;
      try {
        msg = JSON.parse(buf.toString());
      } catch {
        return;
      }

      if (msg.type === "join") {
        const player = {
          id,
          name: String(msg.name || "눈송이").slice(0, 12),
          charType: msg.charType || "rabbit",
          x: Number(msg.x) || 0,
          y: Number(msg.y) || 0,
          z: Number(msg.z) || 5,
          ry: Number(msg.ry) || 0,
          pose: "idle",
          roasting: false,
          toasted: false,
        };
        clients.set(ws, player);

        ws.send(
          JSON.stringify({
            type: "welcome",
            id,
            count: clients.size,
            players: [...clients.values()].filter((p) => p.id !== id),
            snowmen: [...snowmen.values()],
          })
        );

        broadcast({ type: "player_join", player, count: clients.size }, ws);
      } else if (msg.type === "state") {
        const p = clients.get(ws);
        if (!p) return;
        p.x = Number(msg.x) || 0;
        p.y = Number(msg.y) || 0;
        p.z = Number(msg.z) || 0;
        p.ry = Number(msg.ry) || 0;
        p.pose = msg.pose || "idle";
        p.roasting = Boolean(msg.roasting);
        p.toasted = Boolean(msg.toasted);
        broadcast({ type: "player_state", player: p }, ws);
      } else if (msg.type === "chat") {
        const p = clients.get(ws);
        if (!p) return;
        const text = String(msg.text || "").trim().slice(0, 80);
        if (!text) return;
        broadcast({ type: "chat", id: p.id, name: p.name, text });
      } else if (msg.type === "snowman_add") {
        const p = clients.get(ws);
        if (!p || !msg.snowman) return;
        const sm = { ...msg.snowman, ownerId: p.id };
        snowmen.set(sm.id, sm);
        broadcast({ type: "snowman_add", snowman: sm }, ws);
      } else if (msg.type === "snowman_update") {
        const sm = snowmen.get(msg.id);
        if (!sm) return;
        sm.deco = msg.deco;
        broadcast({ type: "snowman_update", id: msg.id, deco: msg.deco }, ws);
      }
    });

    ws.on("close", () => {
      const p = clients.get(ws);
      clients.delete(ws);
      if (p) {
        broadcast({ type: "player_leave", id: p.id, name: p.name, count: clients.size });
      }
    });
  });
}

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  plugins: [
    {
      name: "winter-village-multiplayer",
      configureServer(server) {
        attachShareEndpoint(server.middlewares);
        attachMultiplayerWS(server.httpServer);
      },
      configurePreviewServer(server) {
        attachShareEndpoint(server.middlewares);
        attachMultiplayerWS(server.httpServer);
      },
    },
  ],
});
