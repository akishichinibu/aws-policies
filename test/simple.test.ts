import { Action } from "..";

const a1: Action = "s3:Create*";
const a2: Action = "dynamodb:CreateTable";
const a3: Action = "s3:PutObject";
const a4: Action = "sns:Subscribe";
const a5: Array<Action> = [
  "sns:Subscribe",
  "s3:*",
  "dynamodb:Batch*",
];
