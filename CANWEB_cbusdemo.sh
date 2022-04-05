#! /bin/bash
#
# Start CANWEB using the cbusdemo configuration
#
#	05 April, 2022 - E M Thornber
#	Created
#
savedPWD=$PWD

# shellcheck disable=SC2164
cd /home/pi/Work/MERG-DEV/cbusdemoCW
../canweb/canweb-pi cbusdemo.csv 2>&1 > /dev/null &

# shellcheck disable=SC2164
cd $savedPWD

exit 0

