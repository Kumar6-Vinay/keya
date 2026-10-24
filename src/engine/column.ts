/** Column addition and subtraction for 2- and 3-digit numbers, checked one column at a time,
 *  with the common mistakes recognised. Ported from the Tilli engine and generalised. */

export type Op = "+" | "-";
export type ColumnBug = "smaller_from_larger" | "no_decrement" | "no_carry" | "unneeded_trade" | "ambiguous_trade" | "wrong_digit";

const digits = (n: number, len: number) => String(n).padStart(len, "0").split("").map(Number).reverse(); // [ones, tens, hundreds]

export interface ColumnState {
  a: number; b: number; op: Op; len: number;
  col: number;                 // 0 = ones, 1 = tens, 2 = hundreds; len = done
  written: (number | null)[];  // answer digits by column
  borrowed: boolean[];         // subtraction: column i gave a ten to column i-1
  carried: boolean[];          // addition: a carry was placed on top of column i
  explicit: boolean[];         // the child pressed "trade" for column i (removes ambiguity)
  ambiguous: boolean[];        // a correct digit could also come from a mistake
}

export function newColumn(a: number, b: number, op: Op): ColumnState {
  if (op === "-" && b > a) throw new Error("No negative answers");
  const len = Math.max(String(a).length, String(b).length, String(op === "+" ? a + b : a - b).length);
  return { a, b, op, len, col: 0, written: Array(len).fill(null), borrowed: Array(len).fill(false),
           carried: Array(len).fill(false), explicit: Array(len).fill(false), ambiguous: Array(len).fill(false) };
}

export const answerOf = (s: ColumnState) => (s.op === "+" ? s.a + s.b : s.a - s.b);

/** Does this column need a trade (subtraction) or produce a carry (addition)? */
export function needsTrade(s: ColumnState, col = s.col): boolean {
  const A = digits(s.a, s.len), B = digits(s.b, s.len);
  if (s.op === "+") return A[col] + B[col] + (s.carried[col] ? 1 : 0) > 9;
  const top = A[col] - (col > 0 && s.borrowed[col] ? 1 : 0);
  return top < B[col];
}

/** The digit that should be written in a column, given trades made so far. */
export function expected(s: ColumnState, col = s.col): number {
  const A = digits(s.a, s.len), B = digits(s.b, s.len);
  if (s.op === "+") return (A[col] + B[col] + (s.carried[col] ? 1 : 0)) % 10;
  const top = A[col] - (s.borrowed[col] ? 1 : 0) + (needsTrade(s, col) ? 10 : 0);
  return top - B[col];
}

/** Child presses "trade" (open a ten / carry a ten) for the current column. */
export function trade(s: ColumnState): { ok: boolean; bug?: ColumnBug } {
  if (s.col >= s.len - (s.op === "-" ? 1 : 0)) return { ok: false, bug: "unneeded_trade" };
  if (!needsTrade(s)) return { ok: false, bug: "unneeded_trade" };
  s.explicit[s.col] = true;
  if (s.op === "-") s.borrowed[s.col + 1] = true;
  return { ok: true };
}

/** Child writes a digit in the current column. */
export function enter(s: ColumnState, d: number): { ok: boolean; bug?: ColumnBug; done?: boolean } {
  const col = s.col, A = digits(s.a, s.len), B = digits(s.b, s.len);
  const want = expected(s);
  if (d === want) {
    // Subtraction with a mental trade: accept it and pass the borrow on.
    if (s.op === "-" && needsTrade(s) && !s.explicit[col]) {
      s.borrowed[col + 1] = true;
      // 2 from 12 and 2 from 7... the "smaller from larger" digit can equal the right one: flag it.
      const top = A[col] - (s.borrowed[col] ? 1 : 0);
      if (Math.abs(top - B[col]) === want) s.ambiguous[col] = true;
    }
    if (s.op === "+" && needsTrade(s) && col + 1 < s.len) s.carried[col + 1] = true;
    s.written[col] = d;
    s.col++;
    return { ok: true, done: s.col >= s.len };
  }
  return { ok: false, bug: diagnose(s, d) };
}

function diagnose(s: ColumnState, d: number): ColumnBug {
  const col = s.col, A = digits(s.a, s.len), B = digits(s.b, s.len);
  if (s.op === "+") {
    if (s.carried[col] && d === (A[col] + B[col]) % 10) return "no_carry";
    return "wrong_digit";
  }
  const top = A[col] - (s.borrowed[col] ? 1 : 0);
  if (needsTrade(s) && d === B[col] - top) return "smaller_from_larger";
  if (s.borrowed[col]) {
    // The digit they would get if they forgot that this column gave a ten away.
    const noDec = A[col] < B[col] ? A[col] + 10 - B[col] : A[col] - B[col];
    if (d === noDec) return s.ambiguous[col - 1] ? "ambiguous_trade" : "no_decrement";
  }
  return "wrong_digit";
}

/** For a whole-number answer (word problems, money): what mistake does this value suggest? */
export function diagnoseWhole(a: number, b: number, op: Op, value: number): ColumnBug | "wrong_op" | null {
  const right = op === "+" ? a + b : a - b;
  if (value === right) return null;
  if (op === "-" && value === a + b) return "wrong_op";
  if (op === "+" && value === Math.abs(a - b)) return "wrong_op";
  const len = Math.max(String(a).length, String(b).length);
  const A = digits(a, len), B = digits(b, len);
  if (op === "-") {
    const sfl = Number(A.map((x, i) => Math.abs(x - B[i])).reverse().join(""));
    if (value === sfl) return "smaller_from_larger";
    // forgot to take the borrowed ten off the next column
    let borrow = 0, out: number[] = [];
    for (let i = 0; i < len; i++) { const top = A[i]; if (top < B[i]) { out.push(top + 10 - B[i]); borrow = 1; } else { out.push(top - B[i]); borrow = 0; } }
    if (borrow >= 0 && value === Number(out.reverse().join(""))) return "no_decrement";
  } else {
    const noCarry = Number(A.map((x, i) => (x + B[i]) % 10).reverse().join(""));
    if (value === noCarry) return "no_carry";
  }
  return "wrong_digit";
}
