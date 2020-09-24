const Blockchain = require("./Blockchain").Blockchain;
const BlockchainSchema = require("./Schemas").BlockhainSchema;
const mongoose = require("mongoose");

mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

class BlockchainProxy {
  constructor(connectionURI, ID) {
    this.connectionURI = connectionURI;
    this.ID = ID;
  }

  load() {
    return new Promise((resolve, reject) => {
      mongoose.createConnection(this.connectionURI).then((conn) => {
        this.conn = conn;
        this.conn.db
          .dropDatabase()
          .then((val) => {
            BlockchainSchema.loadClass(Blockchain);
            this.model = this.conn.model("Blockchain", BlockchainSchema);
            let blockchainData = new Blockchain(this.ID);
            this.blockchain = new this.model();
            this.blockchain.chain = blockchainData.chain;
            this.blockchain.ID = blockchainData.ID;
            this.blockchain.pendingTransactions =
              blockchainData.pendingTrasactions;
            this.blockchain
              .save()
              .then((val) => {
                resolve();
              })
              .catch((error) => {
                console.error(
                  "BlockchainProxy failed to connect to the DB at " +
                    this.connectionURI
                );
                reject();
              });
          })
          .catch((error) => {
            console.error(
              "BlockchainProxy failed to connect to the DB at " +
                this.connectionURI
            );
            console.error(err);
            reject();
          });
      });
    });
  }

  save() {
    (async () => {
      try{
      await this.blockchain.save();
      }
      catch(error){
        console.log(error)
      }
    })();
  }
}

module.exports.BlockchainProxy = BlockchainProxy;
