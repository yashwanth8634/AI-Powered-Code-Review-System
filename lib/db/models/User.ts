import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface UserDocument extends Document {
  githubId: string;
  name?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    email: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.virtual("repos", {
  ref: "Repo",
  localField: "_id",
  foreignField: "userId",
});

export const User =
  (models.User as mongoose.Model<UserDocument>) ??
  model<UserDocument>("User", UserSchema);
