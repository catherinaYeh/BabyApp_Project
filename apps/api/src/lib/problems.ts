/**
 * RFC 7807 problem+json helpers and typed error classes.
 */

export type Problem = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
};

export type ValidationProblem = Problem & {
  errors: { path: string; message: string }[];
};

const TYPE_PREFIX = 'https://babyapp.example.com/problems';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly type: string = `${TYPE_PREFIX}/${title.toLowerCase().replace(/\s+/g, '-')}`,
  ) {
    super(detail ?? title);
  }

  toProblem(instance?: string): Problem {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      ...(this.detail ? { detail: this.detail } : {}),
      ...(instance ? { instance } : {}),
    };
  }
}

export class NotFoundError extends HttpError {
  constructor(resource: string, id?: string) {
    super(
      404,
      'Not Found',
      id ? `${resource} with id '${id}' was not found` : `${resource} not found`,
      `${TYPE_PREFIX}/not-found`,
    );
  }
}

export class ConflictError extends HttpError {
  constructor(detail: string) {
    super(409, 'Conflict', detail, `${TYPE_PREFIX}/conflict`);
  }
}

export class ForbiddenError extends HttpError {
  constructor(detail: string) {
    super(403, 'Forbidden', detail, `${TYPE_PREFIX}/forbidden`);
  }
}

export class ValidationError extends HttpError {
  constructor(public readonly errors: { path: string; message: string }[]) {
    super(422, 'Validation failed', undefined, `${TYPE_PREFIX}/validation-error`);
  }

  override toProblem(instance?: string): ValidationProblem {
    return { ...super.toProblem(instance), errors: this.errors };
  }
}
