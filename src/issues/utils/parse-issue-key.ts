import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../../common/constants/error-codes';

export function parseIssueKey(issueKey: string): number {
  const parts = issueKey.split('-');
  const numberPart = parts.pop();
  const issueNumber = Number(numberPart);

  if (!numberPart || isNaN(issueNumber) || issueNumber < 1) {
    throw new BadRequestException({
      message: `Invalid issue key format: '${issueKey}'`,
      errorCode: ErrorCode.VALIDATION_FAILED,
    });
  }

  return issueNumber;
}
