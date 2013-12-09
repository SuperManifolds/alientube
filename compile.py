#!/usr/bin/python2.4
import httplib, urllib, sys, os, shutil, platform, subprocess
closureList = ['Firefox/data/script.js', 'Safari.safariextension/lib/script.js', 'Chrome/lib/script.js']

# Get path to perform operation, if none default to working directory.
path = sys.argv[1]
if (path is None):
    path = os.getcwd()

# Delete previous compilation if any
if (os.path.exists(os.path.join(path, 'gen')))
    shutil.rmtree(os.path.join(path, 'gen'))

# Ensure that required files are in the directories by performing the hardlink script
if (platform.system() == 'Windows'):
    subprocess.call([os.path.join(path, 'setup.bat')])
else:
    subprocess.call('./' + [os.path.join(path, 'setup.sh')])

# Recursively copy the required directories to the result folder
os.makedirs(os.path.join(path, 'gen'))
shutil.copytree(os.path.join(path, 'Safari.safariextension'), os.path.join(path, 'gen', 'Safari.safariextension'))
shutil.copytree(os.path.join(path, 'Safari.Chrome'), os.path.join(path, 'gen', 'Chrome'))
shutil.copytree(os.path.join(path, 'Safari.Firefox'), os.path.join(path, 'gen', 'Firefox'))

# Send the code to Google Closure Compiler
code = open(os.path.join(path, 'lib/script.js'), 'r').read()
params = urllib.urlencode([
    ('js_code', code),
    ('compilation_level', 'SIMPLE OPTIMIZATIONS'),
    ('output_format', 'text'),
    ('output_info', 'compiled_code')
])
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = httplib.HTTPConnection('closure-compiler.appspot.com')
conn.request('POST', '/compile', params, headers)
response = conn.getresponse()
data = response.read()
conn.close()

# Overwrite the files.
for file in closureList:
    open(os.path.join(path, 'gen', file), 'w') as minified:
        minified.write(data)