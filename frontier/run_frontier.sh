#!/bin/bash
# Frontier half of the Nanbeige comparison. Throwaway folders only.
set -u
B="$(cd "$(dirname "$0")/.." && pwd)"; R=$B/results/frontier; mkdir -p $R
run() { # agent test
  a=$1; t=$2; W=/tmp/nbg_work_${a}_${t}; rm -rf $W; mkdir -p $W
  [ "$t" = t3_bug ] && cp $B/bug_hunt/*.py $W/
  P="$(cat $B/prompts/$t.txt)"
  s=$(date +%s.%N)
  if [ $a = codex ]; then
    (cd $W && timeout 900 codex exec --skip-git-repo-check --sandbox workspace-write -C $W "$P" > $R/${a}_${t}.out 2> $R/${a}_${t}.err)
  else
    (cd $W && timeout 900 claude -p "$P" --permission-mode acceptEdits --output-format json > $R/${a}_${t}.out 2> $R/${a}_${t}.err)
  fi
  rc=$?; e=$(date +%s.%N)
  echo "{\"agent\":\"$a\",\"test\":\"$t\",\"rc\":$rc,\"wall_s\":$(python3 -c "print(round($e-$s,1))"),\"end\":\"$(date -Is)\"}" >> $R/runs.jsonl
}
for t in t2_puzzle t3_bug t1_game; do run codex $t & run claude $t; wait; done
echo ALL_DONE
