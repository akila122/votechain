const UserSchema = require("../model/Schemas").UserSchema;
const crypto = require("crypto");
const JWTAuth = require("./JWTAuth.js");
const forge = require("node-forge");
const fs = require("fs");
const mz = require("minizip-asm.js");
const uuidv4 = require("uuid").v4;
const https = require("https");
const axios = require("axios");

const transporter = require("nodemailer").createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

function setupClientAPI(server) {
  server.app.use(JWTAuth.authenticateToken);

  server.app.post("/registration", (req, res) => {
    let User = server.conn.model("User", UserSchema);
    User.find({ username: req.body.username })
      .exec()
      .then((docs) => {
        if (docs.length != 0) res.status(400).send("Username already used.");
        else
          User.find({ email: req.body.email }).then((docs) => {
            if (false) res.status(400).send("Email is already used");
            else {
              User.create({
                name: req.body.name,
                surrname: req.body.surrname,
                email: req.body.email,
                username: req.body.username,
                psswEncrypt: encrypt(server, req.body.password),
                type: req.body.type,
              }).then((data) => {
                res.status(200).send("Done");
                transporter
                  .sendMail({
                    from: process.env.MAIL_USER,
                    to: req.body.email,
                    subject: "Registration activation",
                    text:
                      "Your account for VoteChain Platform has been activated and is ready for use.",
                  })
                  .catch((error) => console.log(error));
              });
            }
          });
      });
  });

  server.app.post("/login", (req, res) => {
    let User = server.conn.model("User", UserSchema);
    User.findOne({ username: req.body.username })
      .then((doc) => {
        if (doc)
          if (doc.psswEncrypt != encrypt(server, req.body.password))
            res.status(401).send("Invalid password");
          else
            res.status(200).send({
              token: JWTAuth.generateAccessToken(req.body.username),
              type: doc.type,
            });
        else res.status(400).send("Invalid username");
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal error");
      });
  });
  server.app.post("/add_voting", async (req, res) => {
    let User = server.conn.model("User", UserSchema);
    User.findOne({ username: req.userTokenData })
      .exec()
      .then((admin) => {
        if (admin == null) {
          console.error("Invalid username found in token");
          res.status(500).send("Internal error");
        } else if (admin.type != "ADMIN") {
          res.status(400).send("Premisson denied");
        } else {
          let voting = {
            type: "VOTING",
            name: req.body.name,
            options: req.body.options,
            dateCreated: new Date(),
            createdBy: admin.username,
            ID: uuidv4().split("-").join(""),
          };

          const httpsAgent = new https.Agent({
            ca: server.cert,
          });
          const instance = axios.create({ httpsAgent });

          instance
            .post(server.nextToServe().nodeURL + "/transact_and_mine", {
              data: voting,
              type: "invChain",
              nodePort: server.port,
              signature: server.authToken,
            })
            .then(async (response) => {
              let promises = [];

              for (username of req.body.usernames) {
                let user = await User.findOne({ username: username });
                if (user == null) continue;
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

                const httpsAgent = new https.Agent({
                  ca: server.cert,
                });
                const instance = axios.create({ httpsAgent });

                let dataVote = {
                  userPU: keyPair.publicKey,
                  votingID: voting.ID,
                  value: -1,
                };
                promises.push(
                  instance
                    .post(
                      server.nextToServe().nodeURL + "/broadcast_transaction",
                      {
                        data: dataVote,
                        type: "voteChain",
                        nodePort: server.port,
                        signature: server.authToken,
                      }
                    )
                    .catch((error) => {
                      console.error(error.response.data);
                    })
                );
                let dataInv = {
                  type: "INVITATION",
                  userPU: keyPair.publicKey,
                  votingID: voting.ID,
                };
                promises.push(
                  instance
                    .post(
                      server.nextToServe().nodeURL + "/broadcast_transaction",
                      {
                        data: dataInv,
                        type: "invChain",
                        nodePort: server.port,
                        signature: server.authToken,
                      }
                    )
                    .catch((error) => {
                      console.error(error.response.data);
                    })
                );

                let zip = new mz();
                let password = decrypt(server, user.psswEncrypt);

                zip.append(
                  "VOTING_ID" + user.username + voting.ID + ".txt",
                  Buffer.from(voting.ID),
                  {
                    password: password,
                  }
                );
                zip.append(
                  "PUBLIC_KEY" + user.username + voting.ID + ".txt",
                  Buffer.from(keyPair.publicKey),
                  {
                    password: password,
                  }
                );
                zip.append(
                  "PRIVATE_KEY" + user.username + voting.ID + ".txt",
                  Buffer.from(keyPair.privateKey),
                  {
                    password: password,
                  }
                );
                fs.writeFileSync(
                  user.username + voting.ID + ".zip",
                  Buffer.from(zip.zip())
                );

                promises.push(
                  transporter
                    .sendMail({
                      from: process.env.MAIL_USER,
                      to: user.email,
                      subject: "Voting invitation",
                      text:
                        "You have been invited to vote for " +
                        voting.name +
                        ".\n" +
                        "Your access keys for this voting are password protected in attached file.\n" +
                        "Please use your account password to retrieve your keys",
                      attachments: [
                        {
                          path: user.username + voting.ID + ".zip",
                        },
                      ],
                    })
                    .then((info) => {
                      fs.unlinkSync(user.username + voting.ID + ".zip");
                    })
                    .catch((error) => {
                      console.log(error);
                    })
                );
              }
              Promise.all(promises).then((results) => {
                let node = server.nextToServe();
                const httpsAgent = new https.Agent({
                  ca: server.cert,
                });
                const instance = axios.create({ httpsAgent });

                instance
                  .post(server.nextToServe().nodeURL + "/mine", {
                    type: "voteChain",
                    nodePort: server.port,
                    signature: server.authToken,
                  })
                  .then((resp) => {
                    instance
                      .post(server.nextToServe().nodeURL + "/mine", {
                        type: "invChain",
                        nodePort: server.port,
                        signature: server.authToken,
                      })
                      .then((resp) => {
                        res.status(200).send({ votingID: voting.ID });
                      })
                      .catch((error) => {
                        console.error("Mining failed while creating voting");
                        res.status(500).send(error.data);
                      });
                  })
                  .catch((error) => {
                    console.error("Mining failed while creating voting");
                    res.status(500).send(error.data);
                  });
              });
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Request failed, please try again");
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Request failed, please try again");
      });
  });

  server.app.post("/voting_options", (req, res) => {
    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });

    instance
      .post(server.nextToServe().nodeURL + "/voting_options", {
        votingID: req.body.votingID,
        signature: server.authToken,
        nodePort: server.port,
      })
      .then((response) => {
        res.send({ options: response.data.options });
      })
      .catch((error) => {
        res.send(error.response.data);
      });
  });
  server.app.post("/add_vote", (req, res) => {
    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });

    let publicKey = req.body.publicKey;
    let votingID = req.body.votingID;

    instance
      .post(server.nextToServe().nodeURL + "/voting_options", {
        votingID: req.body.votingID,
        signature: server.authToken,
        nodePort: server.port,
      })
      .then((response) => {
        let options = response.data.options;
        let opened = response.data.opened;

        if (!opened) {
          res.status(400).send("Chosen voting has been closed.");
        } else {
          instance
            .post(server.nextToServe().nodeURL + "/key_valid", {
              publicKey: publicKey,
              votingID: votingID,
              nodePort: server.port,
              signature: server.authToken,
            })
            .then((response) => {
              console.log(response.data.code);
              if (response.data.code == 0) {
                res.status(400).send("Invalid public key given");
              } else if (response.data.code == 2) {
                res.status(400).send("Vote has already been used");
              } else {
                let voteSign = req.body.voteSign;
                var md = forge.md.sha1.create();
                md.update(req.body.votingID, "utf8");
                let publicKey = forge.pki.publicKeyFromPem(req.body.publicKey);
                if (!publicKey.verify(md.digest().bytes(), voteSign)) {
                  res.status(400).send("Vote note authenticated");
                  return;
                }
                //<username>:<vote_option>
                let encode = req.body.encode;

                let decode = encode.split(":");

                if (
                  decode.length != 2 ||
                  decode[0] != req.userTokenData ||
                  options.indexOf(decode[1]) == -1
                ) {
                  res.status(400).send("Invalid vote send.");
                } else {
                  instance
                    .post(server.nextToServe().nodeURL + "/transact_and_mine", {
                      data: {
                        userPU: req.body.publicKey,
                        votingID: votingID,
                        value: options.indexOf(decode[1]),
                      },
                      type: "voteChain",
                      nodePort: server.port,
                      signature: server.authToken,
                    })
                    .then((response) => {
                      res.status(200).send({msg:"Done"});
                    })
                    .catch((error) => {
                      console.error(error.data);
                      res.status(500).send("Fail");
                    });
                }
              }
            });
        }
      })
      .catch((error) => {
        res.status(400).send(error.response.data);
      });
  });

  server.app.post("/close_voting", (req, res) => {
    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });
    instance
      .post(server.nextToServe().nodeURL + "/voting_options", {
        votingID: req.body.votingID,
        signature: server.authToken,
        nodePort: server.port,
      })
      .then((response) => {
        let options = response.data.options;
        let opened = response.data.opened;

        if (!opened) {
          res.status(400).send("Voting already closed");
        } else {
          let voting = {
            type: "VOTING",
            name: null,
            options: options,
            dateClosed: new Date(),
            closedBy: req.userTokenData,
            ID: req.body.votingID,
          };


          const httpsAgent = new https.Agent({
            ca: server.cert,
          });
          const instance = axios.create({ httpsAgent });

          instance
            .post(server.nextToServe().nodeURL + "/transact_and_mine", {
              data: voting,
              type: "invChain",
              nodePort: server.port,
              signature: server.authToken,
            })
            .then((response) => {
              res.send({ msg: "Voting closed" });
            })
            .catch((error) => {
              console.error(error.response.data);
              res.status(500).send(error.response.data);
            });
        }
      })
      .catch((error) => {
        res.status(400).send(error.response.data);
      });
  });

  server.app.post("/voting_results", (req, res) => {
    const httpsAgent = new https.Agent({
      ca: server.cert,
    });
    const instance = axios.create({ httpsAgent });

    instance
      .post(server.nextToServe().nodeURL + "/voting_results", {
        votingID: req.body.votingID,
        signature: server.authToken,
        nodePort: server.port,
      })
      .then((response) => {
        res.send(response.data);
      })
      .catch((error) => {
        res.send(error.response.data);
      });
  });
  server.app.get("/usernames", (req, res) => {
    let User = server.conn.model("User", UserSchema);
    User.find().then((docs) => {
      res.send({
        usernames: docs
          .filter((doc) => doc.type != "ADMIN")
          .map((doc) => doc.username),
      });
    });
  });
}

function encrypt(server, data) {
  cipher = crypto.createCipheriv(server.algorithm, server.aesKey, server.iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}
function decrypt(server, data) {
  decipher = crypto.createDecipheriv(
    server.algorithm,
    server.aesKey,
    server.iv
  );
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

exports.setup = setupClientAPI;
