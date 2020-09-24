const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const https = require("https");
const http = require("http");
const express = require("express");
const app = express();

const secret = crypto
  .publicDecrypt(
    fs.readFileSync("PUBLIC_KEYfilipbc1cb8dcc86f4376ae739a645815c6e0.txt").toString(),
    Buffer.from("Sl18mnCnmbQh20arxEUvtBcB9okO/x5hpQFbpZqbJ4mKfyY6+w287brzKKzyWkQl7fgfJq1anCfLu/YCz3x+vr5TG6sh8ITytN4fbJ6fc/lWKG54ne7UqDOn/3IpuZ7QaQfh9VFcioSqpgvDtGSJzSe5lpG8ObtoflahhNk8fz8=","ucs2")
  )
  .toString();

  console.log(secret)

/*  
const votingID = fs.readFileSync("VOTING_ID" + inputFile).toString();
const publicKey = fs.readFileSync("PUBLIC_KEY" + inputFile).toString();
const token =
  "eyJhbGciOiJIUzI1NiJ9.bmVuc2k.pIiokrPPUE3wgwpQ2wg7RvadV5npafhO4Q89DuUnpvQ";
const httpsAgent = new https.Agent({
  ca: fs.readFileSync("../certificates/server.cert"),
});

const instance = axios.create({ httpsAgent });

http.createServer(app).listen(3010, () => {
  instance
    .post(
      "https://localhost:3000/add_vote",
      {
        votingID: votingID,
        secret: secret,
        publicKey: publicKey,
      },
      {
        headers: {
          Authorization: `Basic ${token}`,
        },
      }
    )
    .then((res) => {

      console.log(res);
    })
    .catch((error) => {
      console.log(error.response.data)
    });
});
*/