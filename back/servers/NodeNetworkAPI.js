const axios = require("axios");
const https = require("https");
const fs = require("fs");
const uuidv4 = require("uuid").v4;
const crypto = require("crypto");
const Blockchain = require("../model/Blockchain").Blockchain;

function setupProtocolsNodeSide(server) {
  server.app.get("/heartbeat", (req, res) => {
    res.status(200).send("Alive");
  });

  server.app.post("/add_node", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("add_node post not permitted");
      res.status(401).send("Fail");
    } else {
      if (
        server.nodes.filter((node) => node.nodeID == req.body.nodeID).length ==
        0
      )
        server.nodes.push({
          nodeID: req.body.nodeID,
          nodeURL: req.body.nodeURL,
          nodePUK: req.body.nodePUK,
        });
      res.status(200).send("Done");
    }
  });

  server.app.post("/add_transaction", (req, res) => {
    if (!verifyNode(server, req, res)) {
      console.error("add_transaction post not permitted");
      res.status(401).send("Fail");
    } else {
      const proxy = server.chains[req.body.type];
      const newTransaction = {
        ID: req.body.ID,
        data: req.body.data,
      };
      proxy.blockchain.addTransaction(newTransaction);
      proxy.blockchain
        .save()
        .catch((err) => {
          res.status(200).send("Done");
        })
        .then((result) => {
          console.log(
            "Node " + server.myURL + " saved transaction " + req.body.ID
          );
          res.status(200).send("Done");
        });
    }
  });

  server.app.post("/broadcast_transaction", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("broadcast_transaction post not permitted");
      res.status(401).send("Fail");
    } else {
      const newTransaction = {
        ID: uuidv4().split("-").join(""),
        data: req.body.data,
        type: req.body.type,
        nodePort: server.port,
        signature: server.authToken,
      };

      let promises = [];

      for (node of server.nodes) {
        const httpsAgent = new https.Agent({
          ca: server.cert,
        });
        const instance = axios.create({ httpsAgent });

        promises.push(
          instance
            .post(node.nodeURL + "/add_transaction", newTransaction)
            .catch((err) => {
              console.error(
                "Node " +
                  node.nodeURL +
                  " failed to accept transaction " +
                  newTransaction.ID
              );
              console.error(err.response.data);
              console.error("Sending elimination signal to the controller");
              eliminateNode(node.nodeURL, server);
            })
        );
      }
      Promise.allSettled(promises)
        .then((arr) => res.send("Done"))
        .catch((error) => {
          console.error("Broadcast failed.");
        });
    }
  });

  server.app.post("/mine", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("mine post not permitted");
      res.status(401).send("Fail");
    } else {
      const proxy = server.chains[req.body.type];
      const signature = crypto
        .privateEncrypt(
          server.keyPair.privateKey,
          Buffer.from(server.myID.toString())
        )
        .toJSON();
      const newBlock = proxy.blockchain.generateBlock(signature, server.myID);

      let promises = [];
      for (node of server.nodes) {
        if (node.nodeURL != server.myURL) {
          const httpsAgent = new https.Agent({
            ca: server.cert,
          });
          const instance = axios.create({ httpsAgent });

          promises.push(
            instance.post(node.nodeURL + "/add_block", {
              newBlock: newBlock,
              type: req.body.type,
              nodePort: server.port,
              signature: server.authToken,
            })
          );
        }
      }
      proxy.save();
      Promise.allSettled(promises).then(
        (respAccept) => {
          console.log(
            "Node " +
              server.myURL +
              " successfully mined and broadcasted a block on " +
              req.body.type
          );
          res.status(200).send("Done");
        },
        (resReject) => {
          console.error(
            "Node " + server.myURL + " failed to mine and broadcast a block"
          );
          res.status(500).send("Fail");
        }
      );
    }
  });

  server.app.post("/transact_and_mine", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("transact_and_mine post not permitted");
      res.status(401).send("Fail");
    } else {
      const newTransaction = {
        ID: uuidv4().split("-").join(""),
        data: req.body.data,
        type: req.body.type,
        signature: server.authToken,
        nodePort: server.port,
      };

      let promises = [];

      for (node of server.nodes) {
        const httpsAgent = new https.Agent({
          ca: server.cert,
        });
        const instance = axios.create({ httpsAgent });

        promises.push(
          instance
            .post(node.nodeURL + "/add_transaction", newTransaction)
            .catch((err) => {
              console.error(
                "Node " +
                  node.nodeURL +
                  " failed to accept transaction " +
                  newTransaction.ID
              );
              console.error(error.response.data);
              console.error("Sending elimination signal to the controller");

              eliminateNode(node.nodeURL, server);
            })
        );
      }
      Promise.allSettled(promises)
        .then((arr) => {
          const proxy = server.chains[req.body.type];
          const signature = crypto
            .privateEncrypt(
              server.keyPair.privateKey,
              Buffer.from(server.myID.toString())
            )
            .toJSON();
          const newBlock = proxy.blockchain.generateBlock(
            signature,
            server.myID
          );

          let promises = [];
          for (node of server.nodes) {
            if (node.nodeURL != server.myURL) {
              const httpsAgent = new https.Agent({
                ca: server.cert,
              });
              const instance = axios.create({ httpsAgent });

              promises.push(
                instance.post(node.nodeURL + "/add_block", {
                  newBlock: newBlock,
                  type: req.body.type,
                  nodePort: server.port,
                  signature: server.authToken,
                })
              );
            }
          }
          proxy.save();
          Promise.allSettled(promises).then(
            (respAccept) => {
              console.log(
                "Node " +
                  server.myURL +
                  " successfully mined and broadcasted a block on " +
                  req.body.type
              );
              res.status(200).send("Done");
            },
            (resReject) => {
              console.error(
                "Node " +
                  server.nodeURL +
                  " failed to mine and broadcast a block"
              );
              res.status(500).send("Fail");
            }
          );
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Failed to broadcast a transaction");
        });
    }
  });

  server.app.post("/add_block", (req, res) => {
    if (!verifyNode(server, req, res)) {
      console.error("add_block post not permitted");
      res.status(401).send("Fail");
    } else {
      const proxy = server.chains[req.body.type];
      const encrypt = Buffer.from(req.body.newBlock.signature);
      const nodeURL =
        "https://" +
        req.connection.remoteAddress.split(":")[3] +
        ":" +
        req.body.nodePort;
      const miner = server.nodes.filter((node) => node.nodeURL == nodeURL)[0];
      if (miner == undefined) {
        console.log(
          "Unrecognized miner at " +
            nodeURL +
            " tried to mine blockchain " +
            req.body.type
        );
        res.status(400).send("Miner not recognized");
      } else {
        const decrypt = crypto.publicDecrypt(
          miner.nodePUK,
          Buffer.from(encrypt)
        );
        if (!decrypt.equals(Buffer.from(miner.nodeID.toString()))) {
          console.log(
            "Block does not have an authentic signature sent by " +
              nodeURL +
              " in " +
              req.body.type
          );
          console.error("Sending elimination signal to the Controller");
          eliminateNode(nodeURL, server);
          res.status(400).send("Miner not authorized");
        } else {
          if (
            proxy.blockchain.getLastBlock().hash !==
              req.body.newBlock.prevHash ||
            proxy.blockchain.getLastBlock().index + 1 !==
              req.body.newBlock.index
          ) {
            console.error(
              server.myURL +
                "- Block does not have a valid hash or index sent by " +
                nodeURL +
                " in " +
                req.body.type
            );
            console.error("Sending elimination signal to the Controller");
            eliminateNode(nodeURL, server);
            res.status(400).send("Bad block");
          } else {
            proxy.blockchain.addBlock(req.body.newBlock);
            proxy.save();
            console.log(
              "Node " +
                server.myURL +
                " added new block to the chain sent by " +
                nodeURL +
                " in " +
                req.body.type
            );
            res.status(200).send("Block added");
          }
        }
      }
    }
  });

  server.app.put("/eliminate", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("eliminate put not permitted");
      res.status(401).send("Fail");
    } else {
      server.nodes = server.nodes.filter(
        (node) => node.nodeURL != req.body.nodeURL
      );
      console.log("Node " + server.myURL + " eliminated " + req.body.nodeURL);
      res.status(200).send("Done");
    }
  });

  server.app.put("/chain_length", (req, resp) => {
    if (!verifyNode(server, req, resp)) {
      console.error("chain_length put not permitted");
      resp.status(401).send("Fail");
    } else {
      resp.status(200).send({
        length: server.chains[req.body.type].blockchain.chain.length,
        nodeURL: server.myURL,
      });
    }
  });

  server.app.put("/chain", (req, resp) => {
    if (!verifyNode(server, req, resp)) {
      console.error("chain post not permitted");
      res.status(401).send("Fail");
    } else {
      let blockchain = server.chains[req.body.type].blockchain;

      resp.status(200).send({
        chain: blockchain.chain,
        pendingTransactions: blockchain.pendingTransactions,
        id: blockchain.id,
      });
    }
  });

  server.app.post("/voting_options", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("voting_options post not premitted");
      res.status(401).send("Fail");
    } else {
      let proxy = server.chains.invChain;
      let cnt = 0;
      let options = null;
      for (block of proxy.blockchain.chain) {
        for (transaction of block.transactions) {
          if (transaction.data.type == "VOTING") {
            if (transaction.data.ID == req.body.votingID) {
              cnt++;
              options = transaction.data.options;
            }
          }
        }
      }
      if (options != null) {
        res.send({
          options: options,
          opened: cnt == 1,
        });
      } else res.status(400).send("Voting ID not found");
    }
  });

  server.app.post("/key_valid", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("key_valid post not premitted");
      res.status(401).send("Fail");
    } else {
      let proxy = server.chains.voteChain;
      let cnt = 0;
      for (block of proxy.blockchain.chain) {
        for (transaction of block.transactions) {
          if (
            transaction.data.userPU == req.body.publicKey &&
            transaction.data.votingID == req.body.votingID
          ) {
            cnt++;
          }
        }
      }
      res.status(200).send({
        code: cnt,
      });
    }
  });
  server.app.post("/voting_results", (req, res) => {
    if (!verifyController(server, req, res)) {
      console.error("voting_results post not premitted");
      res.status(401).send("Fail");
    } else {
      let proxy = server.chains.invChain;
      let valid = false;
      let closed = false;
      let options = null;
      let dateCreated = null;
      let dateClosed = null;
      let name = null;
      let closedBy = null;
      let createdBy = null;
      let results = [];
      let helper = {};

      for (let block of proxy.blockchain.chain) {
        for (let transaction of block.transactions) {
          if (
            transaction.data.type == "VOTING" &&
            transaction.data.ID == req.body.votingID
          ) {
            if (!transaction.data.dateClosed) {
              valid = true;
              name = transaction.data.name;
              options = transaction.data.options;
              dateCreated = transaction.data.dateCreated;
              createdBy = transaction.data.createdBy;
            } else {
              closed = true;
              closedBy = transaction.data.closedBy;
              dateClosed = transaction.data.dateClosed;
              break;
            }
          }
        }
        if (valid && closed) break;
      }
      if (!valid) {
        res.status(400).send("Invalid votingID");
      } else {
        for (let i = 0; i < options.length; i++) results[i] = 0;
        results.push(0);

        proxy = server.chains.voteChain;
        for (let block of proxy.blockchain.chain) {
          for (let transaction of block.transactions) {
            if (transaction.data.votingID == req.body.votingID) {
              helper[transaction.data.userPU] = transaction.data.value;
            }
          }
        }

        for (x in helper) {
          if (helper[x] == -1) results[results.length - 1]++;
          else results[helper[x]]++;
        }

        res.send({
          name: name,
          createdBy: createdBy,
          closedBy: closedBy,
          dateCreated: dateCreated,
          dateClosed: dateClosed,
          options: options,
          closed: closed,
          results: results,
          votingID: req.body.votingID,
        });
      }
    }
  });
}

function nodeRegistration(server) {
  const httpsAgent = new https.Agent({
    ca: server.cert,
  });
  const instance = axios.create({ httpsAgent });
  return instance.post(server.controllerURL + "/node_registration", {
    nodePort: server.port,
    secret: crypto
      .privateEncrypt(server.key, Buffer.from(process.env.HELLO_SECRET))
      .toJSON(),
  });
}

function consensus(server, type) {
  return new Promise((resolve, reject) => {
    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });
    let maxLength = 1;
    let nodeURL = null;
    let promises = [];
    for (node of server.nodes) {
      if (node.nodeURL != server.myURL) {
        promises.push(
          instance.put(node.nodeURL + "/chain_length", {
            type: type,
            signature: server.authToken,
            nodePort: server.port,
          })
        );
      }
    }
    Promise.allSettled(promises)
      .then((data) => {
        for (resp of data) {
          if (resp.status == "rejected") continue;
          if (resp.value.length >= maxLength) {
            maxLength = resp.data.length;
            nodeURL = resp.data.nodeURL;
          }
        }

        if (maxLength == 1) {
          resolve(null);
          return;
        }

        instance
          .put(nodeURL + "/chain", {
            type: type,
            signature: server.authToken,
            nodePort: server.port,
          })
          .then((resp) => {
            let shell = new Blockchain(0);
            shell.chain = resp.data.chain;
            shell.pendingTransactions = resp.data.pendingTransactions;
            shell.id = resp.data.id;

            if (shell.isChainValid()) {
              resolve(shell);
              return;
            } else {
              console.error("Node " + nodeURL + " sent invalid blockchain.");
              console.error("Sending eliminate signal");
              reject("Invalid chain");
            }
          })
          .catch((error) => {
            console.error(
              "Node " +
                node.nodeURL +
                " failed to send chain. Sending elimination signal"
            );

            eliminateNode(nodeURL, server);
            reject(error);
          });
      })
      .catch((error) => {});
  });
}

function eliminateNode(nodeURL, server) {
  const httpsAgent = new https.Agent({
    ca: server.cert,
  });
  const instance = axios.create({ httpsAgent });
  instance.put(server.controllerURL + "/eliminate", {
    nodeURL: nodeURL,
    nodePort: server.port,
    signature: server.authToken,
  });
}

function verifyNode(server, req, res) {
  const encrypt = Buffer.from(req.body.signature);
  const nodeURL =
    "https://" +
    req.connection.remoteAddress.split(":")[3] +
    ":" +
    req.body.nodePort;

  const sender = server.nodes.filter((node) => node.nodeURL == nodeURL)[0];
  if (!sender) {
    console.error(
      "Unauthenticated entity tried to communicate as a Node from URL" + nodeURL
    );

    return false;
  } else {
    const decrypt = crypto.publicDecrypt(sender.nodePUK, Buffer.from(encrypt));
    if (!decrypt.equals(Buffer.from(sender.nodeID.toString()))) {
      console.error(
        "Unauthenticated entity tried to communicate as a Node with invalid token from URL " +
          nodeURL
      );
      return false;
    } else return true;
  }
}
function verifyController(server, req, res) {
  const encrypt = Buffer.from(req.body.signature);
  const nodeURL =
    "https://" +
    req.connection.remoteAddress.split(":")[3] +
    ":" +
    req.body.nodePort;
  if (nodeURL != server.controllerURL) {
    console.error(
      "Unauthenticated entity tried to communicate as a Controller from URL " +
        nodeURL
    );
    return false;
  } else {
    const decrypt = crypto.publicDecrypt(server.pub, Buffer.from(encrypt));
    if (!decrypt.equals(Buffer.from(process.env.HELLO_SECRET))) {
      console.error(
        "Unauthenticated entity tried to communicate as a Node with invalid token from URL " +
          nodeURL
      );
      return false;
    } else return true;
  }
}

exports.nodeRegistration = nodeRegistration;
exports.setup = setupProtocolsNodeSide;
exports.consensus = consensus;
