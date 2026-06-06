const mongoose = require("mongoose");

const socialLinksSchema = new mongoose.Schema(
  {
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
    youtube: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    twitter: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    telegram: { type: String, default: "" },
  },
  { timestamps: true }
);

// Single-document pattern
socialLinksSchema.statics.getLinks = async function () {
  let links = await this.findOne();
  if (!links) {
    links = await this.create({});
  }
  return links;
};

socialLinksSchema.statics.updateLinks = async function (updates) {
  const links = await this.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return links;
};

module.exports = mongoose.model("SocialLinks", socialLinksSchema);
