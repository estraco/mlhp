import sys
import json
import os
import time
from munch import DefaultMunch

req = DefaultMunch.fromDict(json.loads(sys.argv[1]))

exec('def run(req):\n\t' + sys.argv[2])
print(run(req))
