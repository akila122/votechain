const Schema = require("mongoose").Schema;

const TransactionSchema = new Schema(
  {
    ID: Schema.Types.String,
    data: Schema.Types.Mixed,
  },
  { _id: false }
);

const BlockchainSchema = new Schema(
  {
    chain: [Schema.Types.Mixed],
    pendingTrasactions: [TransactionSchema],
    ID: Schema.Types.String,
  },
);

const UserSchema = new Schema(
  {
    name: Schema.Types.String,
    surrname: Schema.Types.String,
    email: Schema.Types.String,
    username: Schema.Types.String,
    psswEncrypt: Schema.Types.String,
    type: Schema.Types.String,
  }
);

exports.BlockhainSchema = BlockchainSchema;
exports.TransactionSchema = TransactionSchema;
exports.UserSchema = UserSchema;

