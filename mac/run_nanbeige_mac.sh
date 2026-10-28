#!/bin/bash
# Runs on an Apple silicon Mac. Installs only into mac/.venv (no global changes, nothing uninstalled). The Snake test alone can take about an hour per build.
set -u; cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip -q install -U "mlx-lm" > install.log 2>&1; echo "INSTALL_EXIT $?" >> run.log
.venv/bin/python -c "import mlx_lm,mlx.core as mx;print('mlx-lm',mlx_lm.__version__,'mlx',mx.__version__)" >> run.log 2>&1
for pair in "fcmeyer/Nanbeige4.3-33B-MLX-4bit mlx4" "fcmeyer/Nanbeige4.3-33B-MLX-8bit mlx8"; do
  set -- $pair; echo "START $2 $(date)" >> run.log
  /usr/bin/time -l .venv/bin/python nb_run.py $1 $2 >> run_$2.log 2>&1; echo "$2 EXIT $? $(date)" >> run.log
done
echo ALL_DONE >> run.log
