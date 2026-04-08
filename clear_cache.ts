import "dotenv/config";
import { FileCache } from "./src/models/FileCache.js";
import mongoose from "mongoose";

async function clearCache() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("DB Connected");
    
    const result = await FileCache.deleteMany({});
    console.log(`✅ Cleared ${result.deletedCount} cache entries.`);
    
  } catch (err) {
    console.error("Failed to clear cache:", err);
  } finally {
    process.exit(0);
  }
}

clearCache();
