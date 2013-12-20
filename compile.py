#!/usr/bin/python2.4

# Script for compiling (minifying) javascript files with Google Closure compiler

import httplib, urllib, sys, os, shutil, platform, subprocess
closureList = ["Firefox/data/script.js", "Safari.safariextension/js/script.js", "Chrome/js/script.js"]
cssList = ["Firefox/data/style.css", "Safari.safariextension/res/style.css", "Chrome/res/style.css"]

# Get path to perform operation, if none default to working directory.
if (len(sys.argv) > 1):
    path = sys.argv[1];
    os.chdir(path)
else: 
    path = os.getcwd()
    print "-- No path defined, using current working directory. --"
# Delete previous compilation if any
if (os.path.exists(os.path.join(path, "gen"))):
    print "-- Gen folder already exists: Erasing.. --"
    shutil.rmtree(os.path.join(path, "gen"))

# Ensure that required files are in the directories by performing the hardlink script
print "-- Ensuring that all required libraries and resources are hardlinked. --"
if (platform.system() == "Windows"):
    p = subprocess.Popen("setup.bat")
    p.wait()
else:
    p = subprocess.Popen("./setup.sh")
    p.wait()

# Recursively copy the required directories to the result folder
print "-- Generating gen folder. --"
os.makedirs(os.path.join(path, "gen"))
print "-- Copying Safari Files --"
shutil.copytree(os.path.join(path, "Safari.safariextension"), os.path.join(path, "gen", "Safari.safariextension"))
print "-- Copying Chrome files --"
shutil.copytree(os.path.join(path, "Chrome"), os.path.join(path, "gen", "Chrome"))
print "-- Copying Firefox files --"
shutil.copytree(os.path.join(path, "Firefox"), os.path.join(path, "gen", "Firefox"))

# Send the code to Google Closure Compiler
print "-- Compressing script.js --"
code = open(os.path.join(path, "lib/script.js"), "r").read()
params = urllib.urlencode([
    ("js_code", code),
    ("compilation_level", "SIMPLE_OPTIMIZATIONS"),
    ("output_format", "text"),
    ("output_info", "compiled_code")
])
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = httplib.HTTPConnection("closure-compiler.appspot.com")
conn.request("POST", "/compile", params, headers)
response = conn.getresponse()
data = response.read()
conn.close()
# Overwrite the files.
for file in closureList:
    minified = open(os.path.join(path, "gen", file), "w")
    minified.write(data)
    minified.close()
    print "-- " + os.path.join(path, "gen", file) + " has been saved --"

print "-- Minifying style.css --"
params = urllib.urlencode({'file1': open('res/style.css').read()})
conn = httplib.HTTPConnection('reducisaurus.appspot.com')
conn.request('POST', '/css', params, headers)
response = conn.getresponse()
data = response.read()
conn.close()
for file in cssList:
    minified = open(os.path.join(path, "gen", file), "w")
    minified.write(data)
    minified.close()
    print "-- " + os.path.join(path, "gen", file) + " has been saved --"
print "Compiling complete"