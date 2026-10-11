import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface UserDocument extends Document {
  githubId: string;
  name?: string;
  email?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    email: { type: String },
    image: { type: String },
  },
  { timestamps: true },
);

export const User =
  (models.User as mongoose.Model<UserDocument>) ??
  model<UserDocument>("User", UserSchema);
