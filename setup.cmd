files=( jquery-1.9.1.min.js purl.js raven.min.js snuownd.js underscore-min.js script.js )
for file in ${files[@]} do
    mklink /j Chrome\js\$file lib\$file 
    mklink /j Safari.safariextension\js\$file lib\$file
    mklink /j Firefox\data\$file lib\$file
done