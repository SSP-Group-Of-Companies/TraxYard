import { ZodError, ZodSchema } from "zod";

type ResolverReturn = {
  values: any;
  errors: Record<string, any>;
};

function set(obj: any, path: string[], value: any) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in cur)) cur[key] = {};
    cur = cur[key];
  }
  cur[path[path.length - 1]] = value;
}

export function zodRHFResolver(schema: ZodSchema<any>) {
  return async (values: any): Promise<ResolverReturn> => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data, errors: {} };
    }

    const errors: Record<string, any> = {};
    const err: ZodError = parsed.error;
    for (const issue of err.issues) {
      const path = issue.path.map((p) => String(p));
      if (path.length === 0) continue;
      const pathStr = path.join(".");
      let msg = issue.message || "Invalid value";
      // Friendly messages only for types Zod can’t customize well
      if (pathStr === "trip.isLoaded") msg = "Select trailer status (Loaded or Empty)";
      if (pathStr === "trip.trailerBound") msg = "Select trailer direction";
      set(errors, path, {
        type: issue.code,
        message: msg,
      });
    }
    return { values: {}, errors };
  };
}


