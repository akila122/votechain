const axios = require("axios");
const https = require("https");
const fs = require("fs");
const crypto = require("crypto");
const forge = require("node-forge");

function setupProtocolsControllerSide(server) {
  server.app.post("/node_registration", async (req, res) => {
    if (
      !crypto
        .publicDecrypt(server.pub, Buffer.from(req.body.secret))
        .equals(Buffer.from(process.env.HELLO_SECRET))
    ) {
      res.status(401).send("Bad hello secret verification");
      return;
    }

    let nodeID = server.nodes.length;
    let nodeURL =
      "https://" +
      req.connection.remoteAddress.split(":")[3] +
      ":" +
      req.body.nodePort;

    let keyPair = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    server.nodes.push({
      nodeID: nodeID,
      nodeURL: nodeURL,
      nodePUK: keyPair.publicKey,
    });

    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });

    res.status(200).send({
      nodeID: nodeID,
      nodes: server.nodes,
      keyPair: keyPair,
      signature: server.authToken,
    });

    let promises = [];

    for (node of server.nodes) {
      if (node.nodeID !== nodeID) {
        promises.push(
          instance
            .post(node.nodeURL + "/add_node", {
              nodeID: nodeID,
              nodeURL: nodeURL,
              nodePUK: keyPair.publicKey,
              signature: server.authToken,
              nodePort: server.port,
            })
            .catch((error) => {
              console.error(
                "Node " +
                  node.nodeURL +
                  " failed to update network list. Controller will eliminate this node from network"
              );
              console.error(error);
              eliminateNode(nodeURL, server);
            })
        );
      }
    }

    await Promise.allSettled(promises);

    console.log("Node " + nodeURL + " joined the network.");
  });
  server.app.put("/eliminate", (req, res) => {
    const encrypt = Buffer.from(req.body.signature);
    const nodeURL =
      "https://" +
      req.connection.remoteAddress.split(":")[3] +
      ":" +
      req.body.nodePort;
    const sender = server.nodes.filter((node) => node.nodeURL == nodeURL)[0];
    if (!sender) {
      console.error(
        "Unauthorized entity tried to eliminate from URL" + nodeURL
      );
      res.status(401).send("Permission denied");
    } else {
      const decrypt = crypto.publicDecrypt(
        sender.nodePUK,
        Buffer.from(encrypt)
      );
      if (!decrypt.equals(Buffer.from(miner.nodeID.toString()))) {
        console.error(
          "Unauthorized entity tried to eliminate with invalid token from URL" +
            nodeURL
        );
      } else {
        res.status(200).send("Done");
        eliminateNode(req.body.nodeURL, server);
      }
    }
  });
}

function heartbeatProtocol(server) {
  setInterval((h) => {
    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });
    let promises = [];
    for (node of server.nodes) {
      promises.push(
        instance.get(node.nodeURL + "/heartbeat", {}).catch((error) => {
          console.error(
            "Node " +
              node.nodeURL +
              " failed to heartbeat. Controller will eliminate this node from network"
          );
          console.error(error);
          eliminateNode(nodeURL, server);
        })
      );
    }
    (async () => await Promise.allSettled(promises))();
  }, 1000 * 60);
}

function eliminateNode(nodeURL, server) {
  if (server.nodes.filter((node) => node.nodeURL == nodeURL).length == 0)
    return;
  server.nodes = server.nodes.filter((node) => node.nodeURL != nodeURL);
  const httpsAgent = new https.Agent({
    ca: server.cert,
  });
  const instance = axios.create({ httpsAgent });
  for (node of server.nodes) {
    instance
      .put(node.nodeURL + "/eliminate", {
        nodeURL: nodeURL,
        signature: server.authToken,
        nodePort: server.port,
      })
      .catch((error) => {
        console.error(
          "Node " +
            node.nodeURL +
            " failed to eliminate. Controller will eliminate this node from network"
        );
        eliminateNode(node.nodeURL, server);
      });
  }
}

exports.setup = setupProtocolsControllerSide;
exports.heartbeatProtocol = heartbeatProtocol;
