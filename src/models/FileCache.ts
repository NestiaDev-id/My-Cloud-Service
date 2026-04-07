import mongoose from "mongoose";

const fileCacheSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  // Expire after 5 minutes (300 seconds) by default
  // This field is used by MongoDB's TTL index
  expireAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // 0 means it expires exactly at expireAt time
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Clean up: automatic indexing for TTL
// If the collection doesn't exist, mongoose will create the index on startup

export const FileCache = mongoose.model("FileCache", fileCacheSchema);
