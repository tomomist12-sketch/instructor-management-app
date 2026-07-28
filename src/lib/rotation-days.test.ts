import { test } from "node:test";
import assert from "node:assert/strict";
import { expandWeekdays } from "./rotation-days";

// バグ再現: 追加曜日が null/空 のとき Number("")===0 で日曜(0)が混入していた
test("追加曜日 null なら主曜日のみ（日曜を混入しない）", () => {
  assert.deepEqual(expandWeekdays(6, null), [6]);
});

test("追加曜日 空文字でも主曜日のみ", () => {
  assert.deepEqual(expandWeekdays(6, ""), [6]);
  assert.deepEqual(expandWeekdays(4, ""), [4]);
});

test("主曜日が日曜(0)なら [0] のまま", () => {
  assert.deepEqual(expandWeekdays(0, null), [0]);
});

test("追加曜日が明示されていれば含める（昇順）", () => {
  assert.deepEqual(expandWeekdays(2, "5"), [2, 5]);
});

test("明示的に 0 を入れたら日曜も含む（意図的な指定は尊重）", () => {
  assert.deepEqual(expandWeekdays(6, "0,3"), [0, 3, 6]);
});

test("空白・空要素を除去してパース", () => {
  assert.deepEqual(expandWeekdays(6, " 3 , , 5 "), [3, 5, 6]);
});

test("重複は潰す", () => {
  assert.deepEqual(expandWeekdays(6, "6,3"), [3, 6]);
});

test("範囲外(7以上/負)は無視", () => {
  assert.deepEqual(expandWeekdays(6, "7,-1,3"), [3, 6]);
});
