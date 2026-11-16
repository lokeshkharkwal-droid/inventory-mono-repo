import { HttpStatus } from '@nestjs/common';
import { KaltrosException } from '../../../common/exceptions/kaltros.exception';

/** 422 — invalid uploaded file (unsupported type, too large, or missing). */
export class InvalidUploadFileException extends KaltrosException {
  constructor(reason: string) {
    super(
      'INVALID_UPLOAD_FILE',
      reason,
      { reason },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * 500 — the Spaces uploader is not configured (missing bucket/endpoint/
 * credentials). The `context` records which vars were absent for server-side
 * triage; it is never returned to the client.
 */
export class UploadNotConfiguredException extends KaltrosException {
  constructor(missing: string[]) {
    super(
      'UPLOAD_NOT_CONFIGURED',
      'File uploads are not configured on this server',
      { missing },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/** 500 — the file was rejected by Spaces (network/permission/other put failure). */
export class UploadFailedException extends KaltrosException {
  constructor(context: Record<string, unknown> = {}) {
    super(
      'UPLOAD_FAILED',
      'Could not upload the file. Please try again.',
      context,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
