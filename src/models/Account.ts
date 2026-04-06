import mongoose, { Schema, Document } from "mongoose";

export interface IStorageAccount extends Document {
  email: string;
  name: string;
  avatar: string;
  color: string;
  refreshToken: string;
  totalStorage: number;
  usedStorage: number;
  status: "connected" | "disconnected" | "error";
  lastCheck: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StorageAccountSchema = new Schema<IStorageAccount>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "bg-blue-500",
    },
    refreshToken: {
      type: String,
      required: true,
    },
    totalStorage: {
      type: Number,
      default: 0,
    },
    usedStorage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["connected", "disconnected", "error"],
      default: "connected",
    },
    lastCheck: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const StorageAccount = mongoose.model<IStorageAccount>(
  "StorageAccount",
  StorageAccountSchema,
);

export type StorageAccountDTO = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  color: string;
  totalStorage: number;
  usedStorage: number;
  status: "connected" | "disconnected" | "error";
  lastCheck: string;
  isActive: boolean;
};

export function toDTO(account: IStorageAccount): StorageAccountDTO {
  return {
    id: account._id.toString(),
    email: account.email,
    name: account.name,
    avatar: account.avatar || account.name.charAt(0).toUpperCase(),
    color: account.color,
    totalStorage: account.totalStorage,
    usedStorage: account.usedStorage,
    status: account.status,
    lastCheck: account.lastCheck.toISOString(),
    isActive: account.isActive,
  };
}
