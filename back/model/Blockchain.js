const sha256 = require("sha256");

class Blockchain {
  constructor(id) {
    this.chain = [];
    this.pendingTrasactions = [];
    this.id = id;

    const genesisBlock = {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      hash: "0",
      prevHash: "0",
      signature: "0",
      signedBy: "0",
    };
    this.chain.push(genesisBlock);
  }

  generateBlock(signature, singedBy) {
    const block = {
      index: this.chain.length,
      timestamp: Date.now(),
      transactions: this.pendingTrasactions,
      hash: sha256(
        this.chain[this.chain.length - 1].hash +
          JSON.stringify(this.pendingTrasactions) +
          signature +
          singedBy
      ),
      prevHash: this.chain[this.chain.length - 1].hash,
      signature: signature,
      singedBy: singedBy,
    };
    this.chain.push(block);
    this.pendingTrasactions = [];
    return block;
  }

  addTransaction(data) {
    this.pendingTrasactions.push(data);
  }

  addBlock(block) {
    this.chain.push(block);
    this.pendingTrasactions = [];
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  isChainValid() {
    if (
      this.chain[0].index != 0 ||
      this.chain[0].hash != '0' ||
      this.chain[0].prevHash != '0' ||
      this.chain[0].signature != '0' ||
      this.chain[0].signedBy != '0'
    ){



      return false;
    }
      

    for (let i = 1; i < this.chain.length; i++) {
      if (
        this.chain[i].hash !=
          sha256(
            this.chain[i - 1].hash +
              JSON.stringify(this.chain[i].transactions) +
              this.chain[i].signature +
              this.chain[i].singedBy
          ) ||
        this.chain[i].prevHash != this.chain[i - 1].hash
      )
        return false;
    }
    return true;
  }
}

exports.Blockchain = Blockchain;
