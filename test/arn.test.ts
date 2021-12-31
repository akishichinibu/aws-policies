import { Arn } from "lib";

// @ts-expect-error
const arn1: Arn = "arn:s3";

const arn2: Arn = "arn:aws:s3:::happy";

// @ts-expect-error
const arn3: Arn = "arn:aws:s3::happy";

const arn4: Arn = "arn:aws:ec2:";
