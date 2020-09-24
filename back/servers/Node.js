//Imports
const fs = require("fs");
const https = require("https");
const express = require("express");
const dontenv = require("dotenv").config();
const bodyParser = require("body-parser");
const crypto = require("crypto");

const DisocveryProtocol = require("./NodeNetworkAPI.js");
const BlockchainProxy = require("./../model/BlockchainProxy.js")
  .BlockchainProxy;
//PROMENI MY ID DA JE PORT!!!!
class Node {
  constructor(host, port, controllerURL, dbURI) {
    this.stable = 0;
    this.port = port;
    this.host = host;
    this.myURL = "https://" + this.host + ":" + this.port;
    this.myID = null;
    this.controllerURL = controllerURL;
    this.dbURI = dbURI;
    this.keyPair = null;
    this.nodes = [];
    this.chains = {
      invChain: null,
      voteChain: null,
    };
    this.app = express();
    this.key = fs.readFileSync("certificates/server.key");
    this.cert = fs.readFileSync("certificates/server.cert");
    this.pub = fs.readFileSync("certificates/serverpub.key");

    this.authToken = null;

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    DisocveryProtocol.setup(this);

    this.chains.voteChain = new BlockchainProxy(
      this.dbURI + "/nodeDBVote" + port,
      "VOTE"
    );
    this.chains.invChain = new BlockchainProxy(
      this.dbURI + "/nodeDBInv" + port,
      "INV"
    );
  }

  start() {
    this.chains.voteChain
      .load()
      .then(() => {
        console.log(
          "Node " + this.myURL + " connected to voteChain DB at " + this.dbURI
        );
        this.chains.invChain
          .load()
          .then(() => {
            console.log(
              "Node " +
                this.myURL +
                " connected to invChain DB at " +
                this.dbURI
            );
            https
              .createServer(
                {
                  key: this.key,
                  cert: this.cert,
                },
                this.app
              )
              .listen(this.port, async () => {
                try {
                  let resp = await DisocveryProtocol.nodeRegistration(this);
               
                  this.myID = resp.data.nodeID;
                
                 

                  this.nodes.push(...resp.data.nodes);
                  this.keyPair = resp.data.keyPair;
                  this.authToken = crypto
                    .privateEncrypt(
                      server.keyPair.privateKey,
                      Buffer.from(server.myID.toString())
                    )
                    .toJSON();
                  console.log("Node " + this.myURL + " joined the network");
                } catch (error) {
                  console.error(error)
                  console.error("Node failed to join network");
                  process.exit(-1);
                }
                let ret = await DisocveryProtocol.consensus(server, "invChain");

                if (ret != null) {
                  let proxy = this.chains.invChain;
                  proxy.blockchain.chain = ret.chain;
                  proxy.blockchain.id = ret.id;
                  proxy.blockchain.pendingTransactions =
                    ret.pendingTransactions;
                  proxy.save();
                  console.log(
                    "Node " + server.myURL + " updated invitation chain"
                  );
                }

                ret = await DisocveryProtocol.consensus(server, "voteChain");
                if (ret != null) {
                  proxy = this.chains.voteChain;
                  proxy.blockchain.chain = ret.chain;
                  proxy.blockchain.id = ret.id;
                  proxy.blockchain.pendingTransactions =
                    ret.pendingTransactions;
                  proxy.save();

                  console.log("Node " + server.myURL + " updated voting chain");
                }

              });
          })
          .catch(() => {
            console.log(
              "Node " +
                this.myURL +
                " failed to connect to invChain DB at " +
                this.dbURI
            );
            process.exit(-1);
          });
      })
      .catch(() => {
        console.log(
          "Node " +
            this.myURL +
            " failed to connect to voteChain DB at " +
            this.dbURI
        );
        process.exit(-1);
      });
  }
}

const server = new Node(
  process.argv[2],
  process.argv[3],
  process.argv[4],
  process.argv[5]
);
server.start();
