import { useEffect, useState } from "react";
import type { GenOpts } from "../types";
import { generatePassword, passwordEntropy } from "../api";

const DEFAULT: GenOpts = { length: 20, lower: true, upper: true, digits: true, symbols: true, exclude_ambiguous: true };

export function useGenerator() {
  const [opts, setOpts] = useState<GenOpts>(DEFAULT);
  const [value, setValue] = useState("");
  const [bits, setBits] = useState(0);

  useEffect(() => {
    let alive = true;
    passwordEntropy(opts).then((b) => { if (alive) setBits(b); }).catch(() => {});
    return () => { alive = false; };
  }, [opts]);

  const regenerate = async () => {
    const pw = await generatePassword(opts);
    setValue(pw);
  };

  return { opts, setOpts, value, bits, regenerate };
}
