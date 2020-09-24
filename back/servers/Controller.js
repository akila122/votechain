//Imports
const fs = require("fs");
const https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const dontenv = require("dotenv").config();
const crypto = require("crypto");
const cors = require('cors')

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

const DisocveryProtocol = require("./ControllerNetworkAPI.js");
const ClientAPI = require("./ClientAPI.js");

class Controller {
  constructor(host, port, dbURI) {
    this.host = host;
    this.port = port;
    this.myURL = "https://" + this.host + ":" + this.port;
    this.dbURI = dbURI;
    this.conn = null;
    this.nodes = [];
    this.app = express();
    this.toServe = 0;

    this.app.use(cors());
    this.app.use("/images", express.static(__dirname + "/../images"));

    this.key = fs.readFileSync("certificates/server.key");
    this.cert = fs.readFileSync("certificates/server.cert");
    this.pub = fs.readFileSync("certificates/serverpub.key");

    this.authToken = crypto
      .privateEncrypt(this.key, Buffer.from(process.env.HELLO_SECRET))
      .toJSON();

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, "images/");
      },

      filename: function (req, file, cb) {
        cb(
          null,
          req.body.username +
            "." +
            file.originalname.split(".")[
              file.originalname.split(".").length - 1
            ]
        );
      },
    });

    const imageFilter = function (req, file, cb) {
      if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = "Only image files are allowed!";
        return cb(new Error("Only image files are allowed!"), false);
      }
      cb(null, true);
    };

    let upload = multer({
      storage: storage,
      fileFilter: imageFilter,
    }).any();

    this.app.use(upload);

    this.algorithm = "aes-192-cbc";
    this.aesKey = crypto.scryptSync(
      process.env.CHIPER_PASS,
      process.env.CHIPER_SALT,
      24
    );
    this.iv = Buffer.from(process.env.CHIPER_IV);

    DisocveryProtocol.setup(this);
    ClientAPI.setup(this);
  }

  start() {
    mongoose
      .createConnection(this.dbURI + "/logistic")
      .then((conn) => {
        this.conn = conn;
        console.log("Controller connected to DB at " + this.dbURI);
        https
          .createServer(
            {
              key: this.key,
              cert: this.cert,
            },
            this.app
          )
          .listen(this.port, () => {
            console.log("Controller server started on port " + this.port);
            DisocveryProtocol.heartbeatProtocol(this);
            
          });
      })
      .catch((err) => {
        console.error(err);
        console.error("Controller failed to connect to DB at " + this.dbURI);
      });
  }

  nextToServe() {
    return this.nodes[this.toServe++ % this.nodes.length];
  }
}

const server = new Controller(
  process.argv[2],
  process.argv[3],
  process.argv[4]
);
server.start();
