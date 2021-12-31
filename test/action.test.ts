import { Action, Service } from "lib";

const a1: Action = "s3:Create*";
const a2: Action = "dynamodb:CreateTable";
const a3: Action = "s3:PutObject";
const a4: Action = "sns:Subscribe";
const a5: Array<Action> = [
  "sns:Subscribe",
  "s3:*",
  "dynamodb:Batch*",
];


const a6: Action = "s3:*";

// @ts-expect-error
const a7: Action = "s3:X";

// @ts-expect-error
const a8: Action = "s3:GetSuperObject";


const a9: Service = "s3";

// @ts-expect-error
const a10: Service = "s4";
