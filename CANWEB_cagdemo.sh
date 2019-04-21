#! /bin/bash
#
# Start CANWEB using the cagdemo configuration
#
#	20 April, 2019 - E M Thornber
#	Created
#
savedPWD=$PWD

cd /home/pi/Work/MERG-DEV/cagdemoCW
../canweb/canweb-pi cagdemo.csv 2>&1 > /dev/null &

cd $savedPWD

exit 0

