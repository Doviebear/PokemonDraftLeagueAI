import sys
import json
import time

f = open(sys.argv[1])
values = json.load(f)
thingToOutput = int(values["first"]) + int(values["second"])
for i in range(0,10):
    print("on interation " + str(i) + " of loop, thing to output is: " + str(thingToOutput))

time.sleep(10)
print("closing now")
sys.stdout.flush()